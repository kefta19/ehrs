import "server-only";

import { randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { OAuth2Client } from "google-auth-library";

export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";
export const GOOGLE_OAUTH_STATE_TTL_SECONDS = 10 * 60;

export type GoogleOAuthMode = "login" | "register";
export type GoogleOAuthRole = "BUYER" | "SELLER";

export type GoogleOAuthState = {
  state: string;
  nonce: string;
  mode: GoogleOAuthMode;
  role: GoogleOAuthRole;
};

function isLocalHostname(hostname: string) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}

export function getPublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim();
  if (host) {
    const hostname = host.split(":")[0].toLowerCase();
    const forwardedProto = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();
    const proto =
      forwardedProto || (isLocalHostname(hostname) ? "http" : "https");
    return `${proto}://${host}`;
  }
  return request.nextUrl.origin;
}

export function getGoogleOAuthConfig(request?: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const configuredRedirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret) return null;

  let redirectUri = configuredRedirectUri;
  if (request) {
    const origin = getPublicOrigin(request);
    const dynamicRedirectUri = `${origin}/api/auth/google/callback`;
    if (!redirectUri) {
      redirectUri = dynamicRedirectUri;
    } else {
      try {
        const configuredUrl = new URL(redirectUri);
        const requestUrl = new URL(origin);
        if (
          isLocalHostname(configuredUrl.hostname) &&
          !isLocalHostname(requestUrl.hostname)
        ) {
          redirectUri = dynamicRedirectUri;
        }
      } catch {
        redirectUri = dynamicRedirectUri;
      }
    }
  }

  if (!redirectUri) return null;

  try {
    const redirectUrl = new URL(redirectUri);
    if (
      redirectUrl.protocol !== "https:" &&
      !(
        redirectUrl.protocol === "http:" &&
        isLocalHostname(redirectUrl.hostname)
      )
    ) {
      console.warn("GOOGLE_REDIRECT_URI must use HTTPS except on localhost.");
      return null;
    }

    return { clientId, clientSecret, redirectUri };
  } catch {
    return null;
  }
}

export function createGoogleOAuthClient(request?: NextRequest) {
  const config = getGoogleOAuthConfig(request);
  if (!config) throw new Error("Google OAuth is not configured.");

  return {
    config,
    client: new OAuth2Client(
      config.clientId,
      config.clientSecret,
      config.redirectUri,
    ),
  };
}

export function createGoogleOAuthState(
  mode: GoogleOAuthMode,
  role: GoogleOAuthRole,
): GoogleOAuthState {
  return {
    state: randomBytes(32).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
    mode,
    role,
  };
}

export function parseGoogleOAuthState(
  value: string | undefined,
): GoogleOAuthState | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("state" in parsed) ||
      !("nonce" in parsed) ||
      !("mode" in parsed) ||
      !("role" in parsed) ||
      typeof parsed.state !== "string" ||
      typeof parsed.nonce !== "string" ||
      (parsed.mode !== "login" && parsed.mode !== "register") ||
      (parsed.role !== "BUYER" && parsed.role !== "SELLER")
    ) {
      return null;
    }
    return parsed as GoogleOAuthState;
  } catch {
    return null;
  }
}

export function constantTimeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
