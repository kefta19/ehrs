import { NextRequest, NextResponse } from "next/server";
import {
  createGoogleOAuthClient,
  createGoogleOAuthState,
  getGoogleOAuthConfig,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_TTL_SECONDS,
  type GoogleOAuthMode,
  type GoogleOAuthRole,
} from "@/lib/google-oauth";

export async function GET(request: NextRequest) {
  const requestedMode = request.nextUrl.searchParams.get("mode");
  const mode: GoogleOAuthMode =
    requestedMode === "register" ? "register" : "login";
  const pagePath = mode === "register" ? "/register" : "/login";

  try {
    if (!getGoogleOAuthConfig()) {
      return NextResponse.redirect(
        new URL(`${pagePath}?error=google_not_configured`, request.url),
      );
    }

    const requestedRole = request.nextUrl.searchParams.get("role");
    const role: GoogleOAuthRole =
      mode === "register" && requestedRole === "SELLER" ? "SELLER" : "BUYER";
    const oauthState = createGoogleOAuthState(mode, role);
    const { client } = createGoogleOAuthClient();
    const authorizationUrl = client.generateAuthUrl({
      access_type: "online",
      prompt: "select_account",
      scope: ["openid", "email", "profile"],
      state: oauthState.state,
      nonce: oauthState.nonce,
    });

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(
      GOOGLE_OAUTH_STATE_COOKIE,
      JSON.stringify(oauthState),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/auth/google/callback",
        maxAge: GOOGLE_OAUTH_STATE_TTL_SECONDS,
      },
    );
    return response;
  } catch (error) {
    console.error(
      "[Google OAuth] Could not start authentication:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.redirect(
      new URL(`${pagePath}?error=google_failed`, request.url),
    );
  }
}
