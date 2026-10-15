export const MIN_LISTING_IMAGES = 2;
export const BIOMETRIC_MAX_AGE_MS = 15 * 60 * 1000;

type Num = number | string | { toNumber(): number };
const num = (v: Num | null | undefined) =>
  v == null ? NaN : typeof v === "object" ? v.toNumber() : Number(v);

export type ChecklistItem = {
  key: string;
  label: string;
  ok: boolean;
  detail?: string;
};

export type ReadinessListing = {
  images?: unknown[] | null;
  videoUrl?: string | null;
  ownerNationalId?: string | null;
  idDocumentMediaId?: string | null;
  biometricVerificationId?: string | null;
  description?: string | null;
};

export type ReadinessAuction = {
  startingPrice: Num;
  reservePrice?: Num | null;
  minBidIncrement: Num;
  startAt: Date | string;
  endAt: Date | string;
};

export function buildChecklist(
  listing: ReadinessListing,
  auction?: ReadinessAuction | null,
  now: Date = new Date(),
): ChecklistItem[] {
  const imageCount = listing.images?.length ?? 0;
  const items: ChecklistItem[] = [
    {
      key: "images",
      label: `At least ${MIN_LISTING_IMAGES} photos`,
      ok: imageCount >= MIN_LISTING_IMAGES,
      detail: `${imageCount} uploaded`,
    },
    { key: "video", label: "Video of the item", ok: !!listing.videoUrl },
    {
      key: "nationalId",
      label: "National ID number",
      ok:
        !!listing.ownerNationalId && listing.ownerNationalId.trim().length >= 7,
    },
    {
      key: "idDoc",
      label: "National ID document uploaded",
      ok: !!listing.idDocumentMediaId,
    },
    {
      key: "fingerprint",
      label: "Fingerprint (device biometric) verified",
      ok: !!listing.biometricVerificationId,
    },
    {
      key: "description",
      label: "Description of at least 20 characters",
      ok: (listing.description?.trim().length ?? 0) >= 20,
    },
  ];

  if (auction) {
    const start = new Date(auction.startAt);
    const end = new Date(auction.endAt);
    const startingPrice = num(auction.startingPrice);
    const increment = num(auction.minBidIncrement);
    const reserve =
      auction.reservePrice == null ? null : num(auction.reservePrice);

    items.push(
      {
        key: "price",
        label: "Starting price is valid",
        ok: Number.isFinite(startingPrice) && startingPrice > 0,
      },
      {
        key: "increment",
        label: "Bid increment is at least 0.5% of the starting price",
        ok: Number.isFinite(increment) && increment >= startingPrice * 0.005,
      },
      {
        key: "reserve",
        label: "Reserve price is not below the starting price",
        ok: reserve === null || reserve >= startingPrice,
      },
      {
        key: "schedule",
        label: "Schedule is valid and has not already ended",
        ok:
          !Number.isNaN(start.getTime()) &&
          !Number.isNaN(end.getTime()) &&
          end > start &&
          end > now,
      },
    );
  }
  return items;
}

export const failedItems = (items: ChecklistItem[]) =>
  items.filter((i) => !i.ok);

export function evaluateSubmissionReadiness(
  listing: ReadinessListing,
  auction?: ReadinessAuction | null,
  now: Date = new Date(),
) {
  const items = buildChecklist(listing, auction, now);
  const missing = failedItems(items);
  return { items, missing, ready: missing.length === 0 };
}
