import "server-only";

import { randomBytes, timingSafeEqual } from "node:crypto";
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

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) return null;

  const redirectUrl = new URL(redirectUri);
  if (
    redirectUrl.protocol !== "https:" &&
    !(redirectUrl.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(redirectUrl.hostname))
  ) {
    throw new Error("GOOGLE_REDIRECT_URI must use HTTPS except on localhost.");
  }

  return { clientId, clientSecret, redirectUri };
}

export function createGoogleOAuthClient() {
  const config = getGoogleOAuthConfig();
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
