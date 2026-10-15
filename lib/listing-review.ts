export const LISTING_REVIEW_CHECKS = [
  {
    key: "ownerIdentity",
    label: "Owner's national ID number and ID document match the seller's name",
  },
  {
    key: "ownershipDocument",
    label: "Ownership document (title deed / libre) is valid and names the seller as owner",
  },
  {
    key: "referenceMatches",
    label: "Reference number (parcel no. / VIN / serial) matches the ownership document",
  },
  {
    key: "detailsAccurate",
    label: "Property details, location and photos are complete and accurate",
  },
] as const;

export type ListingReviewCheckKey =
  (typeof LISTING_REVIEW_CHECKS)[number]["key"];
