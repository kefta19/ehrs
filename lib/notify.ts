import "server-only";
import { prisma } from "./prisma";

export async function notify(
  userId: string,
  n: { type: string; title: string; body: string; link?: string },
) {
  await prisma.notification.create({ data: { userId, ...n } });
  // Email/SMS delivery hooks go here in the notifications stage.
}

export async function notifyAdmins(n: {
  type: string;
  title: string;
  body: string;
  link?: string;
}) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { id: true },
  });
  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({ userId: a.id, ...n })),
    });
  }
}
