import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  createUserSession,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth";
import { logAudit } from "@/lib/security";
import { ensureBootstrap } from "@/lib/seed";
import { prisma } from "@/lib/prisma";
import { roleHome } from "@/lib/rbac";
import {
  constantTimeStringEqual,
  createGoogleOAuthClient,
  GOOGLE_OAUTH_STATE_COOKIE,
  parseGoogleOAuthState,
} from "@/lib/google-oauth";

function redirectToAuthPage(
  request: NextRequest,
  mode: "login" | "register",
  error: string,
) {
  const response = NextResponse.redirect(
    new URL(`/${mode}?error=${encodeURIComponent(error)}`, request.url),
  );
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google/callback",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const state = parseGoogleOAuthState(
    request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value,
  );
  const mode = state?.mode ?? "login";
  const returnedState = request.nextUrl.searchParams.get("state");

  if (!state || !returnedState || !constantTimeStringEqual(state.state, returnedState)) {
    return redirectToAuthPage(request, mode, "google_failed");
  }

  if (request.nextUrl.searchParams.has("error")) {
    return redirectToAuthPage(request, mode, "google_cancelled");
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) return redirectToAuthPage(request, mode, "google_failed");

  try {
    const { client, config } = createGoogleOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) throw new Error("Google did not return an ID token.");

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: config.clientId,
    });
    const claims = ticket.getPayload();
    if (
      !claims ||
      claims.nonce !== state.nonce ||
      claims.email_verified !== true ||
      !claims.sub ||
      !claims.email
    ) {
      return redirectToAuthPage(request, mode, "google_unverified");
    }

    await ensureBootstrap();

    const email = claims.email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });
    let isNewUser = false;

    if (user && (user.status !== "ACTIVE" || user.deletedAt)) {
      return redirectToAuthPage(request, mode, "google_account_unavailable");
    }

    if (!user) {
      const defaultTenant = await prisma.tenant.findFirst({
        where: { isDefault: true, isActive: true },
        select: { id: true },
      });
      if (!defaultTenant) {
        return redirectToAuthPage(request, mode, "google_registration_unavailable");
      }

      const roleDef = await prisma.role.findUnique({
        where: { name: state.role },
        select: { id: true },
      });
      const profileImage =
        claims.picture && claims.picture.startsWith("https://")
          ? claims.picture
          : null;
      const name =
        claims.name?.trim() ||
        claims.given_name?.trim() ||
        email.slice(0, email.indexOf("@"));

      try {
        user = await prisma.user.create({
          data: {
            name,
            email,
            passwordHash: await hashPassword(randomBytes(48).toString("base64url")),
            googleOnly: true,
            role: state.role,
            roleId: roleDef?.id,
            tenantId: defaultTenant.id,
            status: "ACTIVE",
            emailVerifiedAt: new Date(),
            avatarUrl: profileImage,
            ...(state.role === "BUYER"
              ? { buyerProfile: { create: {} } }
              : {
                  sellerProfile: {
                    create: {
                      nationalIdNumber: "PENDING",
                      address: "Not provided",
                      status: "PENDING",
                    },
                  },
                }),
          },
        });
        isNewUser = true;
      } catch (error) {
        if (
          typeof error !== "object" ||
          error === null ||
          !("code" in error) ||
          error.code !== "P2002"
        ) {
          throw error;
        }
        user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw error;
        if (user.status !== "ACTIVE" || user.deletedAt) {
          return redirectToAuthPage(
            request,
            mode,
            "google_account_unavailable",
          );
        }
      }
    }

    const ipAddress =
      request.headers
        .get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim() || undefined;
    const userAgent = request.headers.get("user-agent") ?? undefined;
    const { token, expiresAt } = await createUserSession(user.id, {
      ipAddress,
      userAgent,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginCount: 0,
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      },
    });

    await logAudit({
      actorId: user.id,
      action: isNewUser ? "USER_REGISTERED" : "USER_LOGIN",
      module: "AUTH",
      entityType: "User",
      entityId: user.id,
      newValue: { role: user.role, provider: "GOOGLE" },
      ipAddress,
      userAgent,
    }).catch((error) => {
      console.error(
        "[Google OAuth] Failed to write audit log:",
        error instanceof Error ? error.message : "Unknown error",
      );
    });

    const response = NextResponse.redirect(
      new URL(roleHome(user.role), request.url),
    );
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/google/callback",
      maxAge: 0,
    });
    setSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    console.error(
      "[Google OAuth] Callback failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return redirectToAuthPage(request, mode, "google_failed");
  }
}
