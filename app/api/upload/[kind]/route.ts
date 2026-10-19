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
    const isAvatarUpload = kind === "avatar";
    if (!isAvatarUpload && !can(user, "listing:create"))
      throw new HttpError(403, "Only sellers can upload listing media");

    if (
      !rateLimit(
        `${isAvatarUpload ? "avatar" : "listing"}-upload:${user.id}`,
        isAvatarUpload ? 10 : 60,
        isAvatarUpload ? 60 * 60_000 : 10 * 60_000,
      )
    )
      throw new HttpError(429, "Too many uploads. Please wait before trying again.");

    const pending = await prisma.mediaFile.count({
      where: { ownerId: user.id, attachedAt: null },
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
    const mime = sniffMime(buf);
    const ext = mime ? rule.types[mime] : undefined;
    if (!mime || !ext) {
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
      const url = `/api/media/${media.id}`;
      if (isAvatarUpload) {
        try {
          await prisma.$transaction([
            prisma.mediaFile.update({
              where: { id: media.id },
              data: { attachedAt: new Date() },
            }),
            prisma.user.update({
              where: { id: user.id },
              data: { avatarUrl: url },
            }),
          ]);
        } catch (err) {
          await prisma.mediaFile.delete({ where: { id: media.id } });
          await deleteFile(storageKey);
          console.error("Failed to attach uploaded profile photo:", err);
          throw new HttpError(500, "Failed to update profile photo. Please try again.");
        }

        const previousUrl = user.avatarUrl;
        const previousId = previousUrl?.match(/^\/api\/media\/([^/?#]+)$/)?.[1];
        if (previousId && previousId !== media.id) {
          try {
            const previousMedia = await prisma.mediaFile.findFirst({
              where: { id: previousId, ownerId: user.id, kind: "IMAGE" },
              select: { id: true, storageKey: true },
            });
            const referencedByListing = previousUrl
              ? await prisma.listing.findFirst({
                  where: {
                    OR: [
                      { videoUrl: previousUrl },
                      { images: { some: { url: previousUrl } } },
                    ],
                  },
                  select: { id: true },
                })
              : null;
            if (previousMedia && !referencedByListing) {
              await prisma.mediaFile.delete({ where: { id: previousMedia.id } });
              await deleteFile(previousMedia.storageKey);
            }
          } catch (error) {
            console.error("Failed to clean up the previous profile photo:", error);
          }
        }
      }
      return NextResponse.json({
        success: true,
        id: media.id,
        url,
        kind: media.kind,
      });
    } catch (err) {
      console.error("Database error creating media record:", err);
      await deleteFile(storageKey);
      throw new HttpError(500, "Failed to save file record. Please try again.");
    }
  });
}
