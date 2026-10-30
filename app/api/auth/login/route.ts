import { NextRequest, NextResponse } from "next/server";

import { createUserSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roleHome } from "@/lib/rbac";
import { logAudit } from "@/lib/security";
import { ensureBootstrap } from "@/lib/seed";
import { loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Run bootstrap in background to ensure database default accounts exist without blocking
    ensureBootstrap().catch((err) => {
      console.error("[Login] Bootstrap error:", err);
    });

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid login credentials",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { roleDef: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Check if account has been soft-deleted
    if (user.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          error: "This account has been deactivated. Please contact support.",
        },
        { status: 403 },
      );
    }

    // Check account status
    if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
      return NextResponse.json(
        {
          success: false,
          error: `Account is currently ${user.status.toLowerCase()}. Please contact support.`,
        },
        { status: 403 },
      );
    }

    // Check if account is temporarily locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (60 * 1000),
      );
      return NextResponse.json(
        {
          success: false,
          error: `Account is temporarily locked. Try again in ${remainingMinutes} minute(s).`,
        },
        { status: 423 },
      );
    }

    // Check if user account was created exclusively through Google OAuth
    if (user.googleOnly) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This account was created via Google. Please use 'Continue with Google' to sign in.",
        },
        { status: 400 },
      );
    }

    // Verify password hash
    const valid = await verifyPassword(password, user.passwordHash);

    if (!valid) {
      const newFailedCount = (user.failedLoginCount || 0) + 1;
      const shouldLock = newFailedCount >= 5;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + 15 * 60 * 1000)
        : null;

      await prisma.user
        .update({
          where: { id: user.id },
          data: {
            failedLoginCount: newFailedCount,
            lockedUntil,
          },
        })
        .catch(() => undefined);

      return NextResponse.json(
        {
          success: false,
          error: shouldLock
            ? "Too many failed attempts. Account locked for 15 minutes."
            : "Invalid email or password",
        },
        { status: 401 },
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    const userAgent = request.headers.get("user-agent") ?? undefined;

    const { token, expiresAt } = await createUserSession(user.id, {
      ipAddress,
      userAgent,
    });

    const response = NextResponse.json({
      success: true,
      redirectTo: roleHome(user.role),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });

    setSessionCookie(response, token, expiresAt);

    // Reset failed login count and log audit in background
    Promise.all([
      prisma.user
        .update({
          where: { id: user.id },
          data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
        })
        .catch(() => undefined),
      logAudit({
        actorId: user.id,
        action: "USER_LOGIN",
        module: "AUTH",
        entityType: "User",
        entityId: user.id,
        newValue: { role: user.role },
        ipAddress,
        userAgent,
      }).catch(() => undefined),
    ]).catch((e) => console.error("Background login tasks error:", e));

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during login" },
      { status: 500 },
    );
  }
}
