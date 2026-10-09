import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  // This table only ever holds logos/favicons; listing docs and KYC files are elsewhere.
  const asset = await prisma.brandingAsset.findUnique({
    where: { id },
    select: { data: true, mimeType: true },
  });
  if (!asset) return new Response("Not found", { status: 404 });
  return new Response(asset.data, {
    headers: {
      "Content-Type": asset.mimeType,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
      // ids change on every upload, so this is safe to cache forever
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
