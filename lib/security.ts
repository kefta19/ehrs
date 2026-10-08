import "server-only";

import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "./prisma";

// NOTE: in-memory limiter. It works on a single server, but on serverless/Vercel each
// instance has its own memory. Swap for Upstash/Redis before production traffic.
const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, maxRequests = 30, windowMs = 60_000) {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count += 1;
  return true;
}

export async function logAudit(input: {
  actorId?: string | null;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  previousValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId,
      previousValue: input.previousValue,
      newValue: input.newValue,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}
