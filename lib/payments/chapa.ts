import "server-only";

const BASE = "https://api.chapa.co/v1";

export const chapaConfigured = () =>
  !!process.env.CHAPA_SECRET_KEY && !!process.env.APP_URL;

function headers() {
  return {
    Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}
export async function initializeChapa(p: {
  amount: string;
  currency: string;
  email: string;
  name: string;
  txRef: string;
}): Promise<{ checkoutUrl: string }> {
  const [first, ...rest] = p.name.trim().split(/\s+/);
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      amount: p.amount,
      currency: p.currency,
      email: p.email,
      first_name: first || "Owner",
      tx_ref: p.txRef,
      callback_url: `${process.env.APP_URL}/api/payments/chapa/webhook`,
      return_url: `${process.env.APP_URL}/seller?fee=${encodeURIComponent(p.txRef)}`,
    }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  const url = json?.data?.checkout_url;
  if (!res.ok || typeof url !== "string")
    throw new Error(
      json?.message
        ? String(json.message)
        : "Chapa could not start the payment.",
    );
  return { checkoutUrl: url };
}

export type ChapaVerification = {
  paid: boolean;
  amount: string;
  currency: string;
  reference: string | null;
};
//  server to server verefication of every transaction cheack out
/** Server-to-server verification. This, not the browser redirect, is the proof of payment. */
export async function verifyChapa(txRef: string): Promise<ChapaVerification> {
  const res = await fetch(
    `${BASE}/transaction/verify/${encodeURIComponent(txRef)}`,
    {
      headers: headers(),
      cache: "no-store",
    },
  );
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data)
    return { paid: false, amount: "0", currency: "", reference: null };
  const d = json.data;
  return {
    paid:
      json.status === "success" && String(d.status).toLowerCase() === "success",
    amount: String(d.amount ?? "0"),
    currency: String(d.currency ?? ""),
    reference: d.reference ? String(d.reference) : null,
  };
}
