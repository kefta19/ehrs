import { NextRequest, NextResponse } from "next/server";

import { createUserSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roleHome } from "@/lib/rbac";
import { logAudit } from "@/lib/security";
import { ensureBootstrap } from "@/lib/seed";
import { registerSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    await ensureBootstrap();
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, email, password, phone, role, businessName, nationalId } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email address already exists." },
        { status: 409 },
      );
    }

    const roleDef = await prisma.role.findUnique({ where: { name: role } });
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        phone: phone || null,
        passwordHash,
        role,
        roleId: roleDef?.id,
        status: "ACTIVE",
        ...(role === "BUYER"
          ? {
              buyerProfile: {
                create: {},
              },
            }
          : {}),
        ...(role === "SELLER"
          ? {
              sellerProfile: {
                create: {
                  nationalIdNumber: nationalId || "PENDING",
                  businessName: businessName || null,
                  address: "Not provided",
                  status: "PENDING",
                },
              },
            }
          : {}),
      },
    });

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
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

    await logAudit({
      actorId: user.id,
      action: "USER_REGISTERED",
      module: "AUTH",
      entityType: "User",
      entityId: user.id,
      newValue: { email: normalizedEmail, role: user.role },
      ipAddress,
      userAgent,
    }).catch(() => undefined);

    return response;
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { success: false, error: "Registration failed. Please try again." },
      { status: 500 },
    );
  }
}
