import "server-only";

import { prisma } from "@/lib/prisma";

export async function isGoogleOnlyAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleOnly: true },
  });
  return user?.googleOnly ?? false;
}
