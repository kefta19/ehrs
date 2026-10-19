"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import {
  getCurrentUser,
  hashToken,
  verifyPassword,
  hashPassword,
} from "@/lib/auth";
import { isGoogleOnlyAccount } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/security";

type AccountActionResult = { success: boolean; message?: string; error?: string };

function revalidateAccountPages() {
  revalidatePath("/buyer");
  revalidatePath("/customer");
  revalidatePath("/seller");
  revalidatePath("/provider");
  revalidatePath("/admin");
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getRawString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function updateAccountProfileAction(
  formData: FormData,
): Promise<AccountActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Please sign in again." };

  const name = getString(formData, "name");
  const phone = getString(formData, "phone");
  if (name.length < 2 || name.length > 100)
    return { success: false, error: "Name must be between 2 and 100 characters." };
  if (phone.length > 30)
    return { success: false, error: "Phone number must be 30 characters or fewer." };

  await prisma.user.update({
    where: { id: user.id },
    data: { name, phone: phone || null },
  });
  revalidateAccountPages();
  return { success: true, message: "Profile details saved." };
}

export async function changeAccountPasswordAction(
  formData: FormData,
): Promise<AccountActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Please sign in again." };
  if (await isGoogleOnlyAccount(user.id)) {
    return {
      success: false,
      error: "This account uses Google sign-in. Manage its password in your Google Account settings.",
    };
  }

  const currentPassword = getRawString(formData, "currentPassword");
  const newPassword = getRawString(formData, "newPassword");
  const confirmPassword = getRawString(formData, "confirmPassword");
  if (!(await verifyPassword(currentPassword, user.passwordHash)))
    return { success: false, error: "Current password is incorrect." };
  if (newPassword.length < 8 || newPassword.length > 128)
    return { success: false, error: "New password must be between 8 and 128 characters." };
  if (newPassword !== confirmPassword)
    return { success: false, error: "New password and confirmation do not match." };
  if (newPassword === currentPassword)
    return { success: false, error: "Choose a password different from your current one." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "PASSWORD_CHANGED",
      module: "AUTH",
      entityType: "User",
      entityId: user.id,
    },
  });
  return { success: true, message: "Password changed successfully." };
}

export async function requestAccountEmailChangeAction(
  formData: FormData,
): Promise<AccountActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Please sign in again." };
  if (await isGoogleOnlyAccount(user.id)) {
    return {
      success: false,
      error: "This account uses Google sign-in. Manage its email address in your Google Account settings.",
    };
  }
  if (!rateLimit(`account-email-change:${user.id}`, 3, 60 * 60_000))
    return {
      success: false,
      error: "Too many email-change requests. Please wait before trying again.",
    };

  const currentPassword = getRawString(formData, "currentPassword");
  const newEmail = getString(formData, "email").toLowerCase();
  if (!(await verifyPassword(currentPassword, user.passwordHash)))
    return { success: false, error: "Current password is incorrect." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) || newEmail.length > 254)
    return { success: false, error: "Enter a valid email address." };
  if (newEmail === user.email.toLowerCase())
    return { success: false, error: "That is already your current email address." };
  const existing = await prisma.user.findUnique({
    where: { email: newEmail },
    select: { id: true },
  });
  if (existing)
    return { success: false, error: "That email address is already in use." };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NODE_ENV === "development" ? "http://localhost:3000" : null);
  // In production, require Resend config. In development, allow a local fallback that logs the verification link.
  const allowDevFallback = process.env.NODE_ENV === "development";
  if ((!apiKey || !from) && !allowDevFallback)
    return {
      success: false,
      error: "Email verification is unavailable because Resend is not configured. Please contact the site administrator.",
    };
  if (!appUrl)
    return {
      success: false,
      error: "Email verification is unavailable because the app URL is not configured.",
    };

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 60_000);
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({
      where: { userId: user.id, type: "EMAIL_CHANGE", usedAt: null },
    }),
    prisma.verificationToken.create({
      data: {
        userId: user.id,
        type: "EMAIL_CHANGE",
        tokenHash,
        pendingEmail: newEmail,
        expiresAt,
      },
    }),
  ]);

  let verificationUrl: string;
  try {
    const url = new URL("/account/verify-email", appUrl);
    url.searchParams.set("token", token);
    verificationUrl = url.toString();
  } catch {
    await prisma.verificationToken.deleteMany({ where: { tokenHash } });
    return {
      success: false,
      error: "Email verification is unavailable because the app URL is invalid.",
    };
  }

  // Development fallback: if Resend is not configured, log the verification link and return success.
  if ((!apiKey || !from) && allowDevFallback) {
    console.info(`[dev-email] Verification link for ${newEmail}: ${verificationUrl}`);
    return {
      success: true,
      message: `A verification link was logged to the server console for ${newEmail} (development fallback).`,
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [newEmail],
        subject: "Verify your new account email",
        text: `Use this link within 30 minutes to change your account email to ${newEmail}:\n\n${verificationUrl.toString()}\n\nIf you did not request this change, ignore this message.`,
      }),
    });
    if (!response.ok) {
      console.error(
        `[account] Email verification delivery failed with status ${response.status}.`,
      );
      await prisma.verificationToken.deleteMany({ where: { tokenHash } });
      return {
        success: false,
        error: "We couldn't send the verification email. Check the email service configuration and try again.",
      };
    }
  } catch (error) {
    console.error(
      "[account] Email verification delivery failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    await prisma.verificationToken.deleteMany({ where: { tokenHash } });
    return {
      success: false,
      error: "We couldn't send the verification email. Please try again later.",
    };
  }

  return {
    success: true,
    message: `A verification link was sent to ${newEmail}. Your current email remains unchanged until you confirm it.`,
  };
}

export async function confirmAccountEmailChangeAction(
  token: string,
): Promise<AccountActionResult> {
  if (!/^[a-f0-9]{64}$/.test(token))
    return { success: false, error: "This verification link is invalid." };
  const tokenHash = hashToken(token);
  const verification = await prisma.verificationToken.findUnique({
    where: { tokenHash },
  });
  if (
    !verification ||
    verification.type !== "EMAIL_CHANGE" ||
    verification.usedAt ||
    verification.expiresAt <= new Date() ||
    !verification.pendingEmail
  )
    return {
      success: false,
      error: "This verification link is invalid or has expired. Request a new email change from account settings.",
    };
  const pendingEmail = verification.pendingEmail;

  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.verificationToken.updateMany({
        where: {
          id: verification.id,
          type: "EMAIL_CHANGE",
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("EMAIL_CHANGE_TOKEN_ALREADY_USED");

      await tx.user.update({
        where: { id: verification.userId },
        data: {
          email: pendingEmail,
          emailVerifiedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: verification.userId,
          action: "EMAIL_CHANGED",
          module: "AUTH",
          entityType: "User",
          entityId: verification.userId,
          newValue: { email: pendingEmail },
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "EMAIL_CHANGE_TOKEN_ALREADY_USED"
    )
      return { success: false, error: "This verification link has already been used." };
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    )
      return {
        success: false,
        error: "That email address has been claimed by another account. Request a different address.",
      };
    console.error(
      "[account] Email change confirmation failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return { success: false, error: "We couldn't update your email. Please try again." };
  }

  revalidateAccountPages();
  return {
    success: true,
    message: "Your new email address has been verified and is now active.",
  };
}
