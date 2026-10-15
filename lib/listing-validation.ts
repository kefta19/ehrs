import { z } from "zod";
import { MIN_LISTING_IMAGES } from "@/lib/listing-readiness";

const money = z.coerce
  .number()
  .positive("Must be greater than 0")
  .max(1_000_000_000_000);

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date");

export const createListingSchema = z.object({
  categoryId: z.string().min(1, "Select a category"),
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(150),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(10000),
  city: z.string().trim().min(2, "City is required").max(100),
  region: z.string().trim().max(100).optional(),
  address: z.string().trim().max(200).optional(),
  referenceNumber: z.string().trim().max(100).optional(),
  condition: z
    .enum(["NEW", "USED", "NOT_APPLICABLE"])
    .default("NOT_APPLICABLE"),
  features: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  imageIds: z
    .array(z.string().min(1))
    .min(MIN_LISTING_IMAGES, `Upload at least ${MIN_LISTING_IMAGES} photos`)
    .max(12, "At most 12 photos"),
  videoId: z.string().min(1, "Upload a video of the item"),
  nationalIdNumber: z
    .string()
    .trim()
    .min(7, "National ID number is required")
    .max(60),
  idDocumentId: z.string().min(1, "Upload a photo or scan of your national ID"),
  ownershipDocumentId: z.string().optional(),
  biometricVerificationId: z
    .string()
    .min(1, "Verify your fingerprint before adding the listing"),
});

export const listingDraftSchema = z.object({
  categoryId: z.string().min(1, "Select a category"),
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(150),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(10000),
  city: z.string().trim().min(2, "City is required").max(100),
  region: z.string().trim().max(100).optional(),
  address: z.string().trim().max(200).optional(),
  referenceNumber: z.string().trim().max(100).optional(),
  condition: z
    .enum(["NEW", "USED", "NOT_APPLICABLE"])
    .default("NOT_APPLICABLE"),
  features: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  imageUrls: z.array(z.string()).default([]),
  attributes: z.record(z.string(), z.unknown()).optional(),
  ownerNationalId: z.string().trim().min(4).max(60).optional(),
  idDocumentMediaId: z.string().optional(),
  ownershipDocumentMediaId: z.string().optional(),
  videoUrl: z.string().url().optional(),
  biometricVerificationId: z.string().optional(),
});

export const submitAuctionSchema = z
  .object({
    listingId: z.string().min(1, "Select a listing"),
    startingPrice: money,
    reservePrice: z.preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      money.optional(),
    ),
    minBidIncrement: money,
    startAt: isoDate,
    endAt: isoDate,
    terms: z.string().trim().max(3000).optional(),
  })
  .superRefine((v, ctx) => {
    const start = Date.parse(v.startAt);
    const end = Date.parse(v.endAt);
    if (start < Date.now() - 5 * 60_000)
      ctx.addIssue({
        code: "custom",
        path: ["startAt"],
        message: "Start time cannot be in the past",
      });
    if (end < start + 60 * 60_000)
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "Auction must run for at least 1 hour",
      });
    if (end > start + 90 * 24 * 60 * 60_000)
      ctx.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "Auction cannot run longer than 90 days",
      });
    if (v.minBidIncrement < v.startingPrice * 0.005)
      ctx.addIssue({
        code: "custom",
        path: ["minBidIncrement"],
        message:
          "Minimum increment must be at least 0.5% of the starting price",
      });
    if (v.reservePrice !== undefined && v.reservePrice < v.startingPrice)
      ctx.addIssue({
        code: "custom",
        path: ["reservePrice"],
        message: "Reserve price cannot be below the starting price",
      });
  });
