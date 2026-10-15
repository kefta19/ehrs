import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security";
import { verifyAndConfirmChapa } from "@/lib/entry-fee-service";
import { chapaConfigured } from "@/lib/payments/chapa";

export const dynamic = "force-dynamic";

/**
 * Unauthenticated by design (Chapa calls it). Nothing in the request body is
 * trusted: we only read the tx_ref and then ask Chapa's verify API whether it
 * was really paid, for the right amount and currency. Replays are harmless.
 */
async function handle(req: NextRequest, txRef: string | null) {
  if (!chapaConfigured())
    return NextResponse.json(
      { error: "Chapa is not configured" },
      { status: 503 },
    );
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`chapa-webhook:${ip}`, 60, 60_000))
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  if (!txRef || txRef.length > 100)
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });

  const result = await verifyAndConfirmChapa(txRef);
  return NextResponse.json({ ok: true, status: result.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  return handle(req, body?.tx_ref ?? body?.trx_ref ?? null);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  return handle(req, q.get("trx_ref") ?? q.get("tx_ref"));
}
