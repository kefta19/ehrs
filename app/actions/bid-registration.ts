"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/security";

type Fail = { success: false; error: string };
const fail = (error: string): Fail => ({ success: false, error });

// ─── Check if buyer has a valid registration for this auction ───────────────

export async function getBidRegistrationStatusAction(auctionId: string): Promise<
  | { success: false; notLoggedIn: true }
  | Fail
  | {
      success: true;
      status: "PAID" | "WAIVED" | "PENDING" | "REJECTED" | "NOT_REGISTERED";
      registrationId?: string;
      feeAmount?: number;
    }
> {
  const user = await getCurrentUser();
  if (!user) return { success: false, notLoggedIn: true };

  const reg = await prisma.buyerBidRegistration.findUnique({
    where: { auctionId_buyerId: { auctionId, buyerId: user.id } },
  });

  if (!reg) return { success: true, status: "NOT_REGISTERED" };

  return {
    success: true,
    status: reg.status,
    registrationId: reg.id,
    feeAmount: Number(reg.feeAmount),
  };
}

// ─── Get the entrance fee amount for an auction ──────────────────────────────

export async function getAuctionEntranceFeeAction(auctionId: string): Promise<
  Fail | { success: true; feeAmount: number; currency: string; auctionTitle: string }
> {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: {
      id: true,
      startingPrice: true,
      listing: { select: { title: true } },
    },
  });
  if (!auction) return fail("Auction not found.");

  // Entrance fee = 1% of starting price (minimum 100 ETB)
  const feeAmount = Math.max(
    100,
    Math.round(Number(auction.startingPrice) * 0.01)
  );

  return {
    success: true,
    feeAmount,
    currency: "ETB",
    auctionTitle: auction.listing.title,
  };
}

// ─── Buyer pays entrance fee (bank transfer proof) ──────────────────────────

export async function payBuyerEntranceFeeAction(formData: FormData): Promise<
  Fail | { success: true; message: string; registrationId: string }
> {
  const user = await getCurrentUser();
  if (!user) return fail("Please sign in to pay the entrance fee.");

  const auctionId = formData.get("auctionId") as string;
  const txRef = (formData.get("txRef") as string)?.trim();
  const feeAmountStr = formData.get("feeAmount") as string;

  if (!auctionId) return fail("Auction ID is required.");
  if (!txRef || txRef.length < 4)
    return fail("Please provide a valid transaction reference (minimum 4 characters).");

  const feeAmount = parseFloat(feeAmountStr || "0");
  if (isNaN(feeAmount) || feeAmount < 0) return fail("Invalid fee amount.");

  // Verify auction exists and is open
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { id: true, status: true, listing: { select: { title: true } } },
  });
  if (!auction) return fail("Auction not found.");
  if (!["ACTIVE", "SCHEDULED"].includes(auction.status))
    return fail("This auction is not currently open for registration.");

  // Check if already registered
  const existing = await prisma.buyerBidRegistration.findUnique({
    where: { auctionId_buyerId: { auctionId, buyerId: user.id } },
  });
  if (existing && (existing.status === "PAID" || existing.status === "WAIVED"))
    return fail("You are already registered to bid on this auction.");

  // Upsert registration with PENDING status + txRef
  let reg;
  try {
    reg = await prisma.buyerBidRegistration.upsert({
      where: { auctionId_buyerId: { auctionId, buyerId: user.id } },
      create: {
        auctionId,
        buyerId: user.id,
        status: "PENDING",
        feeAmount,
        currency: "ETB",
        txRef,
      },
      update: {
        status: "PENDING",
        feeAmount,
        txRef,
      },
    });
  } catch {
    return fail(
      "This transaction reference has already been used. Please provide a unique reference."
    );
  }

  await logAudit({
    actorId: user.id,
    action: "BUYER_ENTRANCE_FEE_SUBMITTED",
    module: "PAYMENTS",
    entityType: "BuyerBidRegistration",
    entityId: reg.id,
    newValue: { auctionId, feeAmount, txRef },
  });

  revalidatePath("/customer");

  return {
    success: true,
    registrationId: reg.id,
    message:
      "Entrance fee payment submitted. An administrator will verify your payment and activate your bidding access shortly.",
  };
}

// ─── Admin: confirm/waive buyer bid registration ──────────────────────────────

export async function adminConfirmBuyerRegistrationAction(
  registrationId: string,
  decision: "PAID" | "WAIVED" | "REJECTED"
): Promise<Fail | { success: true; message: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return fail("Unauthorized.");

  const reg = await prisma.buyerBidRegistration.findUnique({
    where: { id: registrationId },
    select: { id: true, status: true, buyerId: true, auctionId: true },
  });
  if (!reg) return fail("Registration not found.");
  if (reg.status === "PAID" || reg.status === "WAIVED")
    return fail("This registration is already confirmed.");

  await prisma.buyerBidRegistration.update({
    where: { id: registrationId },
    data: {
      status: decision,
      paidAt: decision === "PAID" || decision === "WAIVED" ? new Date() : undefined,
    },
  });

  await logAudit({
    actorId: user.id,
    action: `BUYER_REGISTRATION_${decision}`,
    module: "PAYMENTS",
    entityType: "BuyerBidRegistration",
    entityId: reg.id,
    newValue: { decision },
  });

  revalidatePath("/customer");
  revalidatePath("/admin");

  return {
    success: true,
    message: `Buyer registration ${decision.toLowerCase()}.`,
  };
}

// ─── Get full seller information for a listing (only for logged-in users) ────

export async function getSellerInfoAction(listingId: string): Promise<
  | { success: false; notLoggedIn: true }
  | Fail
  | {
      success: true;
      seller: {
        name: string;
        email: string;
        phone?: string | null;
        businessName?: string | null;
        address?: string | null;
        nationalIdNumber?: string | null;
        kycStatus: string;
      };
    }
> {
  const user = await getCurrentUser();
  if (!user) return { success: false, notLoggedIn: true };

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      seller: {
        select: {
          name: true,
          email: true,
          phone: true,
          sellerProfile: {
            select: {
              businessName: true,
              address: true,
              nationalIdNumber: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!listing) return fail("Listing not found.");

  return {
    success: true,
    seller: {
      name: listing.seller.name,
      email: listing.seller.email,
      phone: listing.seller.phone,
      businessName: listing.seller.sellerProfile?.businessName ?? null,
      address: listing.seller.sellerProfile?.address ?? null,
      nationalIdNumber: listing.seller.sellerProfile
        ? "***-****-" + listing.seller.sellerProfile.nationalIdNumber.slice(-4)
        : null,
      kycStatus: listing.seller.sellerProfile?.status ?? "UNKNOWN",
    },
  };
}
