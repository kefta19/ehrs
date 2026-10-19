"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/security";

export async function initiateBidPaymentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Please sign in to continue." };
  }

  const auctionId = formData.get("auctionId") as string;
  const bidAmountStr = formData.get("bidAmount") as string;
  const method = formData.get("method") as "TELEBIRR" | "CHAPA" | "BANK_TRANSFER";
  const transactionRef = formData.get("transactionRef") as string;
  const bankReferenceUrl = formData.get("bankReferenceUrl");

  if (!auctionId || !bidAmountStr || !method) {
    return { success: false, error: "Invalid payment details." };
  }

  if (!["TELEBIRR", "CHAPA", "BANK_TRANSFER"].includes(method)) {
    return { success: false, error: "Please select a valid payment method." };
  }

  if (typeof bankReferenceUrl !== "string" || !bankReferenceUrl.trim()) {
    return { success: false, error: "Please provide a URL to your payment evidence." };
  }

  try {
    const evidenceUrl = new URL(bankReferenceUrl.trim());
    if (evidenceUrl.protocol !== "https:") throw new Error("Invalid protocol");
  } catch {
    return { success: false, error: "Please provide a valid HTTPS URL for your payment evidence." };
  }

  const bidAmount = parseFloat(bidAmountStr);
  if (isNaN(bidAmount) || bidAmount <= 0) {
    return { success: false, error: "Invalid bid amount." };
  }

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { listing: true },
  });

  if (!auction) {
    return { success: false, error: "Auction not found." };
  }

  if (auction.status !== "ACTIVE") {
    return { success: false, error: "This auction is not accepting bids." };
  }

  // Validate bid amount
  const currentBid = Number(auction.currentHighestBid);
  const minIncrement = Number(auction.minBidIncrement);
  const startingPrice = Number(auction.startingPrice);
  const minimumRequired = currentBid > 0 ? currentBid + minIncrement : startingPrice;

  if (bidAmount < minimumRequired) {
    return { 
      success: false, 
      error: `Bid must be at least ${minimumRequired.toLocaleString()} ETB` 
    };
  }

  try {
    // Create pending bid
    const bid = await prisma.bid.create({
      data: {
        auctionId,
        bidderId: user.id,
        amount: bidAmount,
        status: "PENDING",
      },
    });

    // Create bid payment record
    const txRef = transactionRef || `BP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await prisma.bidPayment.create({
      data: {
        bidId: bid.id,
        amount: bidAmount,
        currency: "ETB",
        method,
        status: method === "BANK_TRANSFER" ? "UNDER_REVIEW" : "PENDING",
        transactionRef: txRef,
        bankReferenceUrl: bankReferenceUrl.trim(),
      },
    });

    // Log audit
    await logAudit({
      actorId: user.id,
      action: "BID_PAYMENT_SUBMITTED",
      module: "PAYMENTS",
      entityType: "BidPayment",
      newValue: {
        auctionId,
        bidAmount,
        method,
      },
    });

    revalidatePath(`/auction/${auctionId}`);
    revalidatePath("/buyer");

    return { success: true, message: "Payment submitted for review." };
  } catch (error) {
    console.error("Bid payment error:", error);
    return { success: false, error: "Failed to submit payment. Please try again." };
  }
}

export async function approveBidPaymentAction(paymentId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const payment = await prisma.bidPayment.findUnique({
      where: { id: paymentId },
      include: { bid: true },
    });

    if (!payment) {
      return { success: false, error: "Payment not found." };
    }

    if (payment.status !== "PENDING" && payment.status !== "UNDER_REVIEW") {
      return { success: false, error: "Payment already processed." };
    }

    // Update payment status
    await prisma.bidPayment.update({
      where: { id: paymentId },
      data: {
        status: "APPROVED",
        verifiedById: user.id,
        verifiedAt: new Date(),
      },
    });

    // Update bid status and approve
    await prisma.bid.update({
      where: { id: payment.bidId },
      data: {
        status: "APPROVED",
        approvedById: user.id,
        approvedAt: new Date(),
      },
    });

    // Update auction's highest bid
    await prisma.auction.update({
      where: { id: payment.bid.auctionId },
      data: {
        currentHighestBid: payment.bid.amount,
        highestBidderId: payment.bid.bidderId,
      },
    });

    // Log audit
    await logAudit({
      actorId: user.id,
      action: "BID_PAYMENT_APPROVED",
      module: "PAYMENTS",
      entityType: "BidPayment",
      entityId: paymentId,
    });

    revalidatePath("/admin");
    revalidatePath("/buyer");

    return { success: true, message: "Bid payment approved." };
  } catch (error) {
    console.error("Approval error:", error);
    return { success: false, error: "Failed to approve payment." };
  }
}

export async function rejectBidPaymentAction(paymentId: string, reason: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const payment = await prisma.bidPayment.findUnique({
      where: { id: paymentId },
      include: { bid: true },
    });

    if (!payment) {
      return { success: false, error: "Payment not found." };
    }

    if (payment.status === "APPROVED" || payment.status === "REJECTED") {
      return { success: false, error: "Payment already processed." };
    }

    // Update payment status
    await prisma.bidPayment.update({
      where: { id: paymentId },
      data: {
        status: "REJECTED",
        verifiedById: user.id,
        verifiedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // Update bid status
    await prisma.bid.update({
      where: { id: payment.bidId },
      data: {
        status: "REJECTED",
      },
    });

    // Log audit
    await logAudit({
      actorId: user.id,
      action: "BID_PAYMENT_REJECTED",
      module: "PAYMENTS",
      entityType: "BidPayment",
      entityId: paymentId,
      newValue: { reason },
    });

    revalidatePath("/admin");
    revalidatePath("/buyer");

    return { success: true, message: "Bid payment rejected." };
  } catch (error) {
    console.error("Rejection error:", error);
    return { success: false, error: "Failed to reject payment." };
  }
}
