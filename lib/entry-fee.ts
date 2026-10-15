/**
 * Entry-fee maths using integer minor units (BigInt) so no floating point is
 * ever involved. Pure module: no DB, no framework imports.
 */
export type FeeSnapshot = {
  basisAmount: string; // e.g. "5000000.00"
  ratePercent: string; // e.g. "2.50"
  amount: string; // e.g. "125000.00"
};
function toScaled(value: string | number, label: string): bigint {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(String(value).trim());
  if (!m) throw new Error(`${label} is not a valid non-negative decimal.`);
  const frac = m[2] ?? "";
  if (/[1-9]/.test(frac.slice(2)))
    throw new Error(`${label} has more than 2 decimal places.`);
  return BigInt(m[1] + frac.slice(0, 2).padEnd(2, "0"));
}
function format(minor: bigint): string {
  const s = minor.toString().padStart(3, "0");
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
}
export function sameAmount(a: string | number, b: string | number): boolean {
  return toScaled(a, "Amount") === toScaled(b, "Amount");
}
/** fee = basis * rate%, rounded half-up to 0.01. */
export function calculateEntryFee(
  basisAmount: string | number,
  ratePercent: string | number,
): FeeSnapshot {
  const basis = toScaled(basisAmount, "Starting price");
  const rate = toScaled(ratePercent, "Entry fee percentage");
  if (basis <= BigInt(0))
    throw new Error("Starting price must be greater than 0.");
  if (rate <= BigInt(0) || rate > BigInt(10_000))
    throw new Error(
      "Entry fee percentage must be greater than 0 and at most 100.",
    );
  const amount = (basis * rate + BigInt(5_000)) / BigInt(10_000);
  if (amount <= BigInt(0)) throw new Error("Calculated entry fee is zero.");
  return {
    basisAmount: format(basis),
    ratePercent: format(rate),
    amount: format(amount),
  };
}
