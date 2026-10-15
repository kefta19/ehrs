import { headers } from "next/headers";

export const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
export const rpName = process.env.WEBAUTHN_RP_NAME || "EHRS Auction Platform";

export async function expectedOrigin(): Promise<string> {
  const host = (await headers()).get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}
