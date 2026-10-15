import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { purgeOrphanMedia, syncAuctionStatuses } from "@/lib/auction-lifecycle";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );

  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await syncAuctionStatuses();
  const purged = await purgeOrphanMedia();
  return NextResponse.json({ ...result, purgedMedia: purged });
}
