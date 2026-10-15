import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const ROOT = path.resolve(
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "storage", "uploads"),
);

export function storagePath(key: string) {
  return path.join(ROOT, path.basename(key));
}

export async function saveFile(buf: Buffer, ext: string) {
  await fs.mkdir(ROOT, { recursive: true });
  const key = `${randomUUID()}.${ext}`;
  await fs.writeFile(storagePath(key), buf, { flag: "wx" });
  return key;
}

export async function deleteFile(key: string) {
  await fs.rm(storagePath(key), { force: true });
}
