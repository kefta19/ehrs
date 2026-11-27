import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const ROOT = path.resolve(
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "storage", "uploads"),
);

export function storagePath(key: string) {
  return path.join(ROOT, path.basename(key));
}

export function newStorageKey(ext: string) {
  return `${randomUUID()}.${ext}`;
}

export async function saveFile(buf: Buffer, ext: string) {
  const key = newStorageKey(ext);
  try {
    await fs.mkdir(ROOT, { recursive: true });
    await fs.writeFile(storagePath(key), buf, { flag: "wx" });
  } catch {
    // Serverless environments (e.g. Vercel) have a read-only filesystem;
    // primary media bytes are persisted in PostgreSQL (MediaFile.data).
  }
  return key;
}

export async function deleteFile(key: string) {
  try {
    await fs.rm(storagePath(key), { force: true });
  } catch {
    // Ignore on read-only filesystems.
  }
}
