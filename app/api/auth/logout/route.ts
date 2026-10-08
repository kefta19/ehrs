import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, clearSessionCookie, destroySession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await destroySession(token);
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    clearSessionCookie(response);
    return response;
  } catch (error) {
    console.error("Logout API error:", error);
    const response = NextResponse.json({
      success: true,
      message: "Logged out",
    });
    clearSessionCookie(response);
    return response;
  }
}
