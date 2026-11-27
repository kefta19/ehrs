import "dotenv/config";
import { promises as fs } from "node:fs";
import { prisma } from "../lib/prisma";
import { storagePath } from "../lib/storage";

async function main() {
  const rows = await prisma.mediaFile.findMany({
    where: { data: null },
    select: { id: true, storageKey: true, sizeBytes: true },
  });

  console.log(`Found ${rows.length} MediaFile rows without database bytes.`);
  let updated = 0;
  let missing = 0;

  for (const row of rows) {
    try {
      const buf = await fs.readFile(storagePath(row.storageKey));
      await prisma.mediaFile.update({
        where: { id: row.id },
        data: { data: buf },
      });
      updated++;
    } catch {
      missing++;
    }
  }

  console.log(`Backfill complete: ${updated} updated, ${missing} missing on disk.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
