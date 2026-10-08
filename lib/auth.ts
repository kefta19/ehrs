import "server-only";

import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

import type { UserRole } from "@/app/generated/prisma/enums";
import { forbidden, unauthorized } from "./http";
import { can, type Permission } from "./rbac";
import { prisma } from "./prisma";

export const SESSION_COOKIE_NAME = "auction_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash);
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function createUserSession(
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    },
  });
  return { token, expiresAt };
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}

async function resolveSession(token?: string) {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { roleDef: true } } },
  });
  if (!session) return null;
  const { user } = session;
  if (
    session.expiresAt < new Date() ||
    user.status !== "ACTIVE" ||
    user.deletedAt
  ) {
    await prisma.session
      .delete({ where: { id: session.id } })
      .catch(() => undefined);
    return null;
  }
  return user;
}

export async function getCurrentUser() {
  const store = await cookies();
  return resolveSession(store.get(SESSION_COOKIE_NAME)?.value);
}

export const getCurrentUserFromRequest = (request: NextRequest) =>
  resolveSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);

export async function destroySession(token?: string) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

export async function requireRole(...roles: UserRole[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role)) throw forbidden();
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireAuth();
  if (!can(user, permission)) throw forbidden();
  return user;
}
