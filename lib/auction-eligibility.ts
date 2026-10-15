/**
 * Single source of truth for "may this auction accept bids / show LIVE?".
 * Used by the bid transaction, the scheduler and the UI so they cannot drift.
 */
export type EligibilityInput = {
  auctionStatus: string;
  listingStatus: string;
  entryFeeStatus: string;
  startAt: Date;
  endAt: Date;
};

export type IneligibleReason =
  | "CANCELLED"
  | "NOT_OPEN"
  | "NOT_APPROVED"
  | "FEE_NOT_CONFIRMED"
  | "NOT_STARTED"
  | "ENDED";

export type Eligibility =
  | { ok: true }
  | { ok: false; reason: IneligibleReason; message: string };

const no = (reason: IneligibleReason, message: string): Eligibility => ({
  ok: false,
  reason,
  message,
});

export function bidEligibility(i: EligibilityInput, now: Date): Eligibility {
  if (i.auctionStatus === "CANCELLED")
    return no("CANCELLED", "This auction has been cancelled.");
  if (i.auctionStatus === "CLOSED" || i.auctionStatus === "COMPLETED")
    return no("ENDED", "This auction has already closed.");
  if (i.auctionStatus !== "SCHEDULED" && i.auctionStatus !== "ACTIVE")
    return no("NOT_OPEN", "This auction is not open for bidding.");
  if (i.listingStatus !== "APPROVED")
    return no("NOT_APPROVED", "This listing has not been approved.");
  if (i.entryFeeStatus !== "CONFIRMED" && i.entryFeeStatus !== "WAIVED")
    return no("FEE_NOT_CONFIRMED", "The entry fee has not been confirmed.");
  if (now.getTime() < i.startAt.getTime())
    return no("NOT_STARTED", "This auction has not started yet.");
  if (now.getTime() >= i.endAt.getTime())
    return no("ENDED", "This auction has already closed.");
  return { ok: true };
}

export type AuctionPhase =
  | "UPCOMING"
  | "LIVE"
  | "ENDED"
  | "CANCELLED"
  | "PAUSED";

/** What the UI may show. "LIVE" only when bids would actually be accepted. */
export function auctionPhase(i: EligibilityInput, now: Date): AuctionPhase {
  if (i.auctionStatus === "CANCELLED") return "CANCELLED";
  if (i.auctionStatus === "SUSPENDED") return "PAUSED";
  if (i.auctionStatus === "CLOSED" || i.auctionStatus === "COMPLETED")
    return "ENDED";
  if (bidEligibility(i, now).ok) return "LIVE";
  return now.getTime() >= i.endAt.getTime() ? "ENDED" : "UPCOMING";
}
