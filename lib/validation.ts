import { z } from "zod";

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{7,15}$/, "Enter a valid phone number");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

export const adminPasswordSchema = passwordSchema
  .min(10, "Admin passwords must be at least 10 characters");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(100),
    email: z.string().trim().toLowerCase().email("Use a valid email address"),
    password: passwordSchema,
    phone: phone.optional().or(z.literal("")),
    role: z.enum(["BUYER", "SELLER"]).default("BUYER"),
    businessName: z.string().trim().max(120).optional(),
    nationalId: z.string().trim().max(60).optional(),
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Use a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const money = z.coerce
  .number()
  .positive("Must be greater than 0")
  .max(1_000_000_000);

export const propertySchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 chars").max(150),
  description: z.string().trim().min(20, "Description must be at least 20 chars").max(5000),
  type: z.enum(["RESIDENTIAL", "COMMERCIAL", "LAND", "INDUSTRIAL"]),
  address: z.string().trim().min(5, "Street address required").max(200),
  city: z.string().trim().min(2, "City required").max(100),
  state: z.string().trim().min(2, "State/Region required").max(100),
  postalCode: z.string().trim().min(2, "Postal code required").max(20),
  parcelNumber: z.string().trim().min(3, "Parcel registration number required").max(100),
  lotSizeSqFt: z.coerce.number().positive("Lot size must be positive"),
  buildingSizeSqFt: z.coerce.number().positive().optional(),
  bedrooms: z.coerce.number().int().min(0).max(100).optional(),
  bathrooms: z.coerce.number().min(0).max(50).optional(),
  yearBuilt: z.coerce.number().int().min(1800).max(new Date().getFullYear() + 1).optional(),
  facilities: z.array(z.string().trim()).default([]),
  images: z.array(z.string().url("Must be valid URL")).min(1, "At least one image is required"),
  documentTitle: z.string().trim().default("Title Deed Certificate"),
  documentUrl: z.string().trim().min(1, "Ownership or Title Deed document link is required"),
});

export const auctionSchema = z
  .object({
    propertyId: z.string().min(1, "Select an approved property"),
    startingPrice: money,
    reservePrice: money.optional(),
    minBidIncrement: money,
    startAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid start date"),
    endAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid end date"),
    terms: z.string().trim().max(3000).optional(),
  })
  .refine((v) => Date.parse(v.endAt) > Date.parse(v.startAt), {
    path: ["endAt"],
    message: "Auction closing time must be after opening time",
  })
  .refine((v) => v.minBidIncrement >= v.startingPrice * 0.005, {
    path: ["minBidIncrement"],
    message: "Minimum increment must be at least 0.5% of starting price",
  });

export const bidSchema = z.object({
  auctionId: z.string().min(1),
  amount: money,
});

export const paymentSettlementSchema = z.object({
  auctionResultId: z.string().min(1),
  method: z.enum(["CARD", "BANK_TRANSFER", "ESCROW_WALLET"]),
  transactionRef: z.string().trim().min(4, "Transaction reference required").max(100),
  receiptUrl: z.string().trim().optional(),
  notes: z.string().trim().max(500).optional(),
});

export const sellerKycSchema = z.object({
  nationalIdNumber: z.string().trim().min(4, "National ID or Passport number required").max(100),
  businessName: z.string().trim().max(150).optional(),
  taxId: z.string().trim().max(100).optional(),
  address: z.string().trim().min(5, "Physical address required").max(300),
  idDocumentUrl: z.string().trim().min(1, "Identity document link is required"),
});

export const ticketSchema = z.object({
  type: z.enum(["SUPPORT", "COMPLAINT", "PROBLEM_REPORT", "DISPUTE"]),
  subject: z.string().trim().min(5, "Subject must be at least 5 chars").max(140),
  description: z.string().trim().min(10, "Provide a clear description").max(4000),
  auctionId: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
});
