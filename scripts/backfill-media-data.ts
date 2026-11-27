import "dotenv/config";
import { promises as fs } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { storagePath } from "../lib/storage";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing");
}

const sql = neon(connectionString);

async function main() {
  await sql`ALTER TABLE "MediaFile" ADD COLUMN IF NOT EXISTS "data" BYTEA`;

  const rows = (await sql`
    SELECT "id", "storageKey", "sizeBytes"
    FROM "MediaFile"
    WHERE "data" IS NULL
  `) as Array<{ id: string; storageKey: string; sizeBytes: number }>;

  console.log(`Found ${rows.length} MediaFile rows without database bytes.`);
  let updated = 0;
  let missing = 0;

  for (const row of rows) {
    try {
      const buf = await fs.readFile(storagePath(row.storageKey));
      await sql`
        UPDATE "MediaFile"
        SET "data" = ${buf}
        WHERE "id" = ${row.id}
      `;
      updated++;
    } catch {
      missing++;
    }
  }

  console.log(`Backfill complete: ${updated} updated, ${missing} missing on disk.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
