import type { MediaKind } from "@/app/generated/prisma/enums";

const MB = 1024 * 1024;
const IMG: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const DOC: Record<string, string> = { ...IMG, "application/pdf": "pdf" };

export const UPLOAD_RULES = {
  image: { kind: "IMAGE" as MediaKind, maxBytes: 10 * MB, types: IMG },
  video: {
    kind: "VIDEO" as MediaKind,
    maxBytes: 80 * MB,
    types: {
      "video/mp4": "mp4",
      "video/webm": "webm",
      "video/quicktime": "mov",
    } as Record<string, string>,
  },
  id: { kind: "ID_DOCUMENT" as MediaKind, maxBytes: 10 * MB, types: DOC },
  document: {
    kind: "OWNERSHIP_DOCUMENT" as MediaKind,
    maxBytes: 15 * MB,
    types: DOC,
  },
};
export type UploadKind = keyof typeof UPLOAD_RULES;

export function sniffMime(b: Buffer): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return "image/png";
  if (
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  if (b.toString("ascii", 0, 4) === "%PDF") return "application/pdf";
  if (b.toString("ascii", 4, 8) === "ftyp")
    return b.toString("ascii", 8, 12) === "qt  "
      ? "video/quicktime"
      : "video/mp4";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3)
    return "video/webm";
  return null;
}
