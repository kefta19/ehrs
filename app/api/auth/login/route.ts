import { NextRequest, NextResponse } from "next/server";

import { createUserSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roleHome } from "@/lib/rbac";
import { logAudit } from "@/lib/security";
import { ensureBootstrap } from "@/lib/seed";
import { loginSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    await ensureBootstrap();
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid login credentials", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { roleDef: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
      return NextResponse.json(
        { success: false, error: `Account is currently ${user.status.toLowerCase()}. Please contact support.` },
        { status: 403 },
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);

    if (!valid) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: { increment: 1 } },
      }).catch(() => undefined);

      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    const userAgent = request.headers.get("user-agent") ?? undefined;

    const { token, expiresAt } = await createUserSession(user.id, {
      ipAddress,
      userAgent,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), failedLoginCount: 0 },
    }).catch(() => undefined);

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

    await logAudit({
      actorId: user.id,
      action: "USER_LOGIN",
      module: "AUTH",
      entityType: "User",
      entityId: user.id,
      newValue: { role: user.role },
      ipAddress,
      userAgent,
    }).catch(() => undefined);

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { success: false, error: "Login failed. Please try again." },
      { status: 500 },
    );
  }
}
