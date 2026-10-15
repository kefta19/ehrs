import { createReadStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";

import type { AuctionStatus } from "@/app/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storagePath } from "@/lib/storage";

export const dynamic = "force-dynamic";

const PUBLIC_STATUSES: AuctionStatus[] = [
  "SCHEDULED",
  "ACTIVE",
  "SUSPENDED",
  "CLOSED",
  "COMPLETED",
];

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const missing = () => new NextResponse("Not found", { status: 404 });

  const media = await prisma.mediaFile.findUnique({ where: { id } });
  if (!media) return missing();

  const user = await getCurrentUser();
  let allowed = !!user && (user.id === media.ownerId || user.role === "ADMIN");

  if (!allowed && (media.kind === "IMAGE" || media.kind === "VIDEO")) {
    const url = `/api/media/${media.id}`;
    const published = await prisma.listing.findFirst({
      where: {
        OR: [{ videoUrl: url }, { images: { some: { url } } }],
        auctions: { some: { status: { in: PUBLIC_STATUSES } } },
      },
      select: { id: true },
    });
    allowed = !!published;
  }
  if (!allowed) return missing();

  const file = storagePath(media.storageKey);
  let size: number;
  try {
    size = (await fs.stat(file)).size;
  } catch {
    return missing();
  }

  let start = 0;
  let end = size - 1;
  let status = 200;
  const range = request.headers.get("range");
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    const bad = () =>
      new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    if (!m || (m[1] === "" && m[2] === "")) return bad();
    if (m[1] === "") {
      start = Math.max(size - Number(m[2]), 0);
    } else {
      start = Number(m[1]);
      if (m[2] !== "") end = Math.min(Number(m[2]), size - 1);
    }
    if (start > end || start >= size) return bad();
    status = 206;
  } else if (size === 0) {
    return missing();
  }

  const stream = Readable.toWeb(
    createReadStream(file, { start, end }),
  ) as unknown as ReadableStream;
  const isPublicMedia = media.kind === "IMAGE" || media.kind === "VIDEO";
  return new NextResponse(stream, {
    status,
    headers: {
      "Content-Type": media.mimeType,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
      "Cache-Control": isPublicMedia
        ? "private, max-age=3600"
        : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(status === 206
        ? { "Content-Range": `bytes ${start}-${end}/${size}` }
        : {}),
    },
  });
}
