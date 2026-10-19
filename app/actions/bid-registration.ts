"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify, notifyAdmins } from "@/lib/notify";
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
  Fail | { success: true; message: string; registrationId: string; feeAmount: number }
> {
  const user = await getCurrentUser();
  if (!user) return fail("Please sign in to pay the entrance fee.");
  if (user.role !== "BUYER") return fail("Only buyers can register to bid.");

  const auctionId = formData.get("auctionId") as string;
  const txRef = (formData.get("txRef") as string)?.trim();
  const paymentMethod = formData.get("method") as string;
  const paymentProofUrl = (formData.get("paymentProofUrl") as string)?.trim();

  if (!auctionId) return fail("Auction ID is required.");
  if (!txRef || txRef.length < 4)
    return fail("Please provide a valid transaction reference (minimum 4 characters).");
  if (!["TELEBIRR", "CHAPA", "BANK_TRANSFER"].includes(paymentMethod))
    return fail("Please select a valid payment method.");
  if (!paymentProofUrl) return fail("Please provide a URL to your payment receipt.");
  try {
    const proofUrl = new URL(paymentProofUrl);
    if (proofUrl.protocol !== "https:") throw new Error("Invalid protocol");
  } catch {
    return fail("Please provide a valid HTTPS URL for your payment receipt.");
  }

  // Verify auction exists and is open
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: {
      id: true,
      status: true,
      startingPrice: true,
      listing: { select: { title: true, status: true } },
    },
  });
  if (!auction) return fail("Auction not found.");
  if (auction.listing.status !== "APPROVED")
    return fail("This auction's listing has not been approved.");
  if (!["ACTIVE", "SCHEDULED"].includes(auction.status))
    return fail("This auction is not currently open for registration.");
  const feeAmount = Math.max(100, Math.round(Number(auction.startingPrice) * 0.01));

  // Check if already registered
  const existing = await prisma.buyerBidRegistration.findUnique({
    where: { auctionId_buyerId: { auctionId, buyerId: user.id } },
  });
  if (existing && (existing.status === "PAID" || existing.status === "WAIVED"))
    return fail("You are already registered to bid on this auction.");
  if (existing?.status === "PENDING")
    return fail("Your entrance fee payment is already under admin review.");
  const duplicateTxRef = await prisma.buyerBidRegistration.findUnique({
    where: { txRef },
    select: { id: true },
  });
  if (duplicateTxRef && duplicateTxRef.id !== existing?.id)
    return fail("This transaction reference has already been used. Please provide a unique reference.");

  const reg = await prisma.buyerBidRegistration.upsert({
    where: { auctionId_buyerId: { auctionId, buyerId: user.id } },
    create: {
      auctionId,
      buyerId: user.id,
      status: "PENDING",
      feeAmount,
      currency: "ETB",
      txRef,
      paymentMethod,
      paymentProofUrl,
      note: null,
    },
    update: {
      status: "PENDING",
      feeAmount,
      txRef,
      paymentMethod,
      paymentProofUrl,
      paidAt: null,
      note: null,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "BUYER_ENTRANCE_FEE_SUBMITTED",
    module: "PAYMENTS",
    entityType: "BuyerBidRegistration",
    entityId: reg.id,
    newValue: { auctionId, feeAmount, txRef, paymentMethod, paymentProofUrl },
  });

  await notifyAdmins({
    type: "BUYER_ENTRANCE_FEE_SUBMITTED",
    title: "Buyer entrance fee needs review",
    body: `${user.name} submitted ${feeAmount} ETB via ${paymentMethod} for "${auction.listing.title}" (ref: ${txRef}).`,
    link: "/admin?tab=payments",
  });
  revalidatePath("/customer");
  revalidatePath("/buyer");
  revalidatePath("/admin");
  revalidatePath(`/auction/${auctionId}`);

  return {
    success: true,
    registrationId: reg.id,
    feeAmount,
    message:
      "Payment proof submitted for admin review. You can bid once an administrator approves it.",
  };
}

// ─── Admin: confirm/waive buyer bid registration ──────────────────────────────

export async function adminConfirmBuyerRegistrationAction(
  registrationId: string,
  decision: "PAID" | "WAIVED" | "REJECTED",
  note = "",
): Promise<Fail | { success: true; message: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return fail("Unauthorized.");
  if (!["PAID", "WAIVED", "REJECTED"].includes(decision))
    return fail("Invalid registration decision.");
  if (note.trim().length > 500) return fail("Review notes cannot exceed 500 characters.");

  const reg = await prisma.buyerBidRegistration.findUnique({
    where: { id: registrationId },
    include: {
      buyer: { select: { name: true } },
      auction: { include: { listing: { select: { title: true } } } },
    },
  });
  if (!reg) return fail("Registration not found.");
  if (
    decision === "PAID" &&
    (!reg.paymentMethod || !reg.paymentProofUrl || !reg.txRef || Number(reg.feeAmount) <= 0)
  ) {
    return fail("The buyer must submit a payment method, transaction reference, receipt, and valid fee amount before approval.");
  }
  if (reg.status === "PAID" || reg.status === "WAIVED")
    return fail("This registration is already confirmed.");
  if (reg.status !== "PENDING")
    return fail("Only payments awaiting review can be approved or rejected.");

  await prisma.buyerBidRegistration.update({
    where: { id: registrationId },
    data: {
      status: decision,
      paidAt: decision === "PAID" || decision === "WAIVED" ? new Date() : undefined,
      note: note.trim() || null,
    },
  });

  await logAudit({
    actorId: user.id,
    action: `BUYER_REGISTRATION_${decision}`,
    module: "PAYMENTS",
    entityType: "BuyerBidRegistration",
    entityId: reg.id,
    newValue: { decision, note: note.trim() || null },
  });

  await notify(reg.buyerId, {
    type: `BUYER_ENTRANCE_FEE_${decision}`,
    title:
      decision === "REJECTED"
        ? "Entrance fee payment needs correction"
        : "Entrance fee approved - You can bid",
    body:
      decision === "REJECTED"
        ? `Your entrance fee payment for "${reg.auction.listing.title}" was not approved.${note.trim() ? ` Note: ${note.trim()}` : " Please submit a new payment proof."}`
        : `Your entrance fee payment for "${reg.auction.listing.title}" has been approved. You can now place and increase bids.`,
    link: `/buyer?tab=browse`,
  });

  revalidatePath("/customer");
  revalidatePath("/buyer");
  revalidatePath("/admin");
  revalidatePath(`/auction/${reg.auctionId}`);

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
