import { z } from "zod";
import { isHexColor } from "./branding-shared";

export const brandingSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(200),
  logoUrl: z.string().url().nullable().optional(),
  faviconUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().refine(isHexColor, "Must be a valid hex color (e.g., #2563EB)"),
  secondaryColor: z.string().refine(isHexColor, "Must be a valid hex color (e.g., #0F172A)"),
  backgroundColor: z.string().refine(isHexColor, "Must be a valid hex color (e.g., #F8FAFC)"),
  textColor: z.string().refine(isHexColor, "Must be a valid hex color (e.g., #1E293B)"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  role: z.enum(["BUYER", "SELLER", "ADMIN"]),
  businessName: z.string().optional(),
  nationalId: z.string().optional(),
});

export const bidSchema = z.object({
  auctionId: z.string().min(1, "Auction ID is required"),
  amount: z.number().positive("Bid amount must be positive"),
});

export const paymentSettlementSchema = z.object({
  auctionResultId: z.string().min(1, "Auction result ID is required"),
  method: z.enum(["CARD", "BANK_TRANSFER", "ESCROW_WALLET"]),
  transactionRef: z.string().min(1, "Transaction reference is required"),
  receiptUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export const ticketSchema = z.object({
  type: z.enum(["SUPPORT", "COMPLAINT", "PROBLEM_REPORT", "DISPUTE"]),
  subject: z.string().min(1, "Subject is required").max(200),
  description: z.string().min(1, "Description is required"),
  auctionId: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
});
