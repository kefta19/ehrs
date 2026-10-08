import "server-only";

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing");
  }

  const adapter = new PrismaNeon({ connectionString });

  return new PrismaClient({ adapter });
}

import { ensureBootstrap } from "./seed";

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Ensure default roles, categories, settings, and admin account are bootstrapped
ensureBootstrap().catch((err) => {
  console.error("Bootstrap initialization error:", err);
});
