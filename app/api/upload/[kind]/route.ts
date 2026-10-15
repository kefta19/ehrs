import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { handle, HttpError, notFound } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { rateLimit } from "@/lib/security";
import { deleteFile, saveFile } from "@/lib/storage";
import { sniffMime, UPLOAD_RULES, type UploadKind } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const MAX_UNATTACHED_PER_USER = 40;

export function POST(
  request: NextRequest,
  ctx: { params: Promise<{ kind: string }> },
) {
  return handle(async () => {
    const { kind } = await ctx.params;
    // UPLOAD_RULES keys are lowercase
    if (!Object.hasOwn(UPLOAD_RULES, kind)) throw notFound();
    const rule = UPLOAD_RULES[kind as UploadKind];

    const user = await requireAuth();
    if (!can(user, "listing:create"))
      throw new HttpError(403, "Only sellers can upload listing media");

    if (!rateLimit(`listing-upload:${user.id}`, 60, 10 * 60_000))
      throw new HttpError(429, "Too many uploads. Please wait a few minutes.");

    const pending = await prisma.mediaFile.count({
      where: { ownerId: user.id },
    });
    if (pending >= MAX_UNATTACHED_PER_USER)
      throw new HttpError(
        429,
        "Too many unused uploads. Finish or cancel your current listing first.",
      );

    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > rule.maxBytes + 64 * 1024)
      throw new HttpError(
        413,
        `File is too large (max ${Math.round(rule.maxBytes / 1048576)} MB)`,
      );

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "No file uploaded");
    if (file.size === 0) throw new HttpError(400, "File is empty");
    if (file.size > rule.maxBytes)
      throw new HttpError(
        413,
        `File is too large (max ${Math.round(rule.maxBytes / 1048576)} MB)`,
      );

    const buf = Buffer.from(await file.arrayBuffer());
    console.log(`File buffer size: ${buf.length}`);
    const mime = sniffMime(buf);
    console.log(`Detected MIME type: ${mime}`);
    const ext = mime ? rule.types[mime] : undefined;
    console.log(`Extension: ${ext}, rule types:`, rule.types);
    if (!mime || !ext) {
      console.error(`Unsupported file type. MIME: ${mime}, File type: ${file.type}`);
      throw new HttpError(
        415,
        `Unsupported file type. Allowed: ${Object.values(rule.types).join(", ")}`,
      );
    }

    const storageKey = await saveFile(buf, ext);
    try {
      const media = await prisma.mediaFile.create({
        data: {
          ownerId: user.id,
          kind: rule.kind,
          mimeType: mime,
          sizeBytes: buf.length,
          storageKey: storageKey,
        },
      });
      return NextResponse.json({
        success: true,
        id: media.id,
        url: `/api/media/${media.id}`,
        kind: media.kind,
      });
    } catch (err) {
      console.error("Database error creating media record:", err);
      await deleteFile(storageKey);
      throw new HttpError(500, "Failed to save file record. Please try again.");
    }
  });
}
