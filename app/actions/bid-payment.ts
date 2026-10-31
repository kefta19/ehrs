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
  if (user.role !== "BUYER") {
    return { success: false, error: "Only buyers can submit bid payments." };
  }

  const auctionId = formData.get("auctionId") as string;
  const bidAmountStr = formData.get("bidAmount") as string;
  const method = formData.get("method") as "TELEBIRR" | "CHAPA" | "BANK_TRANSFER";
  const transactionRefValue = formData.get("transactionRef");
  const transactionRef =
    typeof transactionRefValue === "string" ? transactionRefValue.trim() : "";
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

  const bidAmount = Number(bidAmountStr);
  if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
    return { success: false, error: "Invalid bid amount." };
  }

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { listing: true },
  });

  if (!auction) {
    return { success: false, error: "Auction not found." };
  }

  const now = new Date();
  if (
    auction.sellerId === user.id ||
    auction.status !== "ACTIVE" ||
    auction.startAt > now ||
    auction.endAt <= now
  ) {
    return { success: false, error: "This auction is not accepting bids." };
  }

  const [entryFee, registration] = await Promise.all([
    prisma.buyerAuctionEntryFee.findUnique({
      where: { auctionId_buyerId: { auctionId, buyerId: user.id } },
      select: { status: true },
    }),
    prisma.buyerBidRegistration.findUnique({
      where: { auctionId_buyerId: { auctionId, buyerId: user.id } },
      select: { status: true },
    }),
  ]);
  if (
    entryFee?.status !== "CONFIRMED" &&
    registration?.status !== "PAID" &&
    registration?.status !== "WAIVED"
  ) {
    return {
      success: false,
      error: "Pay the auction entrance fee before submitting a bid.",
    };
  }

  const existingPendingBid = await prisma.bid.findFirst({
    where: {
      auctionId,
      bidderId: user.id,
      status: "PENDING",
      payment: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
    },
    select: { id: true },
  });
  if (existingPendingBid) {
    return {
      success: false,
      error: "You already have a bid payment waiting for admin review.",
    };
  }

  const currentBid = Number(auction.currentHighestBid);
  const minIncrement = Number(auction.minBidIncrement);
  const startingPrice = Number(auction.startingPrice);
  const minimumRequired = currentBid > 0 ? currentBid + minIncrement : startingPrice;

  if (bidAmount < minimumRequired) {
    return {
      success: false,
      error: `Bid must be at least ${minimumRequired.toLocaleString()} ETB`,
    };
  }

  try {
    const txRef =
      transactionRef ||
      `BP-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    await prisma.bid.create({
      data: {
        auctionId,
        bidderId: user.id,
        amount: bidAmount,
        status: "PENDING",
        payment: {
          create: {
            amount: bidAmount,
            currency: "ETB",
            method,
            status: method === "BANK_TRANSFER" ? "UNDER_REVIEW" : "PENDING",
            transactionRef: txRef,
            bankReferenceUrl: bankReferenceUrl.trim(),
          },
        },
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
    revalidatePath("/customer");
    revalidatePath("/admin");

    return {
      success: true,
      message: "Bid payment submitted for admin review.",
    };
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
    const now = new Date();
    const approval = await prisma.$transaction(async (tx) => {
      const payment = await tx.bidPayment.findUnique({
        where: { id: paymentId },
        include: { bid: { include: { auction: true } } },
      });

      if (!payment) {
        return { success: false as const, error: "Payment not found." };
      }
      if (payment.status !== "PENDING" && payment.status !== "UNDER_REVIEW") {
        return { success: false as const, error: "Payment already processed." };
      }
      if (payment.bid.status !== "PENDING") {
        return { success: false as const, error: "Bid already processed." };
      }

      const auction = payment.bid.auction;
      if (auction.status !== "ACTIVE" || auction.endAt <= now) {
        return {
          success: false as const,
          error: "The auction has ended; this bid can no longer be approved.",
        };
      }

      const currentBid = Number(auction.currentHighestBid);
      const minimumRequired =
        currentBid > 0
          ? currentBid + Number(auction.minBidIncrement)
          : Number(auction.startingPrice);
      if (
        Number(payment.amount) !== Number(payment.bid.amount) ||
        Number(payment.bid.amount) < minimumRequired
      ) {
        return {
          success: false as const,
          error: `This bid is no longer high enough. The current minimum is ${minimumRequired.toLocaleString()} ETB.`,
        };
      }

      const timeLeftMs = auction.endAt.getTime() - now.getTime();
      const newEndAt =
        timeLeftMs > 0 && timeLeftMs < 5 * 60 * 1000
          ? new Date(now.getTime() + 5 * 60 * 1000)
          : auction.endAt;
      const claimed = await tx.auction.updateMany({
        where: {
          id: auction.id,
          status: "ACTIVE",
          endAt: { gt: now },
          currentHighestBid: auction.currentHighestBid,
        },
        data: {
          currentHighestBid: payment.bid.amount,
          highestBidderId: payment.bid.bidderId,
          endAt: newEndAt,
        },
      });
      if (claimed.count !== 1) {
        return {
          success: false as const,
          error: "The auction changed while reviewing this bid. Refresh and try again.",
        };
      }

      await tx.bidPayment.update({
        where: { id: paymentId },
        data: { status: "APPROVED", verifiedById: user.id, verifiedAt: now },
      });
      await tx.bid.update({
        where: { id: payment.bidId },
        data: { status: "APPROVED", approvedById: user.id, approvedAt: now },
      });
      return {
        success: true as const,
        auctionId: auction.id,
      };
    });

    if (!approval.success) return approval;

    // Log audit
    await logAudit({
      actorId: user.id,
      action: "BID_PAYMENT_APPROVED",
      module: "PAYMENTS",
      entityType: "BidPayment",
      entityId: paymentId,
    });

    revalidatePath("/admin");
    revalidatePath(`/auction/${approval.auctionId}`);
    revalidatePath("/buyer");
    revalidatePath("/customer");
    revalidatePath("/provider");

    return { success: true, message: "Payment approved and bid is now active." };
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
    if (!reason.trim()) {
      return { success: false, error: "A rejection reason is required." };
    }

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
    revalidatePath("/customer");

    return { success: true, message: "Bid payment rejected." };
  } catch (error) {
    console.error("Rejection error:", error);
    return { success: false, error: "Failed to reject payment." };
  }
}
