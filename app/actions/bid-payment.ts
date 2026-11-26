"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { logAudit } from "@/lib/security";
import {
  bidBoundary,
  extendedDeadline,
  isValidBid,
} from "@/lib/auction-bidding";
import { bidEligibility } from "@/lib/auction-eligibility";

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
  const method = formData.get("method") as
    | "TELEBIRR"
    | "CHAPA"
    | "BANK_TRANSFER";
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
    return {
      success: false,
      error: "Please provide a URL to your payment evidence.",
    };
  }

  try {
    const evidenceUrl = new URL(bankReferenceUrl.trim());
    if (evidenceUrl.protocol !== "https:") throw new Error("Invalid protocol");
  } catch {
    return {
      success: false,
      error: "Please provide a valid HTTPS URL for your payment evidence.",
    };
  }

  if (!/^\d{1,10}(\.\d{1,2})?$/.test(bidAmountStr.trim())) {
    return { success: false, error: "Invalid bid amount." };
  }

  try {
    const amount = new Prisma.Decimal(bidAmountStr.trim());
    const txRef =
      transactionRef ||
      `BP-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const submission = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Auction" WHERE "id" = ${auctionId} FOR UPDATE`;
      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
        include: {
          listing: {
            select: {
              title: true,
              tenantId: true,
              status: true,
              entryFeeStatus: true,
            },
          },
        },
      });
      if (!auction) return { success: false as const, error: "Auction not found." };
      if (auction.sellerId === user.id)
        return { success: false as const, error: "You cannot bid on your own auction." };
      if (
        user.tenantId &&
        auction.listing.tenantId &&
        user.tenantId !== auction.listing.tenantId
      )
        return { success: false as const, error: "Auction not found." };

      const now = new Date();
      const eligibility = bidEligibility(
        {
          auctionStatus: auction.status,
          listingStatus: auction.listing.status,
          entryFeeStatus: auction.listing.entryFeeStatus,
          startAt: auction.startAt,
          endAt: auction.endAt,
        },
        now,
      );
      if (!eligibility.ok)
        return { success: false as const, error: eligibility.message };

      const [entryFee, registration, existingPendingBid] = await Promise.all([
        tx.buyerAuctionEntryFee.findUnique({
          where: { auctionId_buyerId: { auctionId, buyerId: user.id } },
          select: { status: true },
        }),
        tx.buyerBidRegistration.findUnique({
          where: { auctionId_buyerId: { auctionId, buyerId: user.id } },
          select: { status: true },
        }),
        tx.bid.findFirst({
          where: {
            auctionId,
            bidderId: user.id,
            status: "PENDING",
            payment: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
          },
          select: { id: true },
        }),
      ]);
      if (
        entryFee?.status !== "CONFIRMED" &&
        registration?.status !== "PAID" &&
        registration?.status !== "WAIVED"
      )
        return {
          success: false as const,
          error: "Pay the auction entrance fee before submitting a bid.",
        };
      if (existingPendingBid)
        return {
          success: false as const,
          error: "You already have a bid payment waiting for admin review.",
        };

      const boundary = bidBoundary({
        type: auction.type,
        current: auction.currentHighestBid,
        startingPrice: auction.startingPrice,
        increment: auction.minBidIncrement,
      });
      if (
        !isValidBid({
          type: auction.type,
          amount,
          current: auction.currentHighestBid,
          startingPrice: auction.startingPrice,
          increment: auction.minBidIncrement,
        })
      )
        return {
          success: false as const,
          bidBoundary: Number(boundary.toFixed(2)),
          error:
            auction.type === "REVERSE"
              ? `Bid must be no more than ${Number(boundary.toFixed(2)).toLocaleString()} ETB.`
              : `Bid must be at least ${Number(boundary.toFixed(2)).toLocaleString()} ETB.`,
        };

      await tx.bid.create({
        data: {
          auctionId,
          bidderId: user.id,
          amount,
          status: "PENDING",
          payment: {
            create: {
              amount,
              currency: "ETB",
              method,
              status: method === "BANK_TRANSFER" ? "UNDER_REVIEW" : "PENDING",
              transactionRef: txRef,
              bankReferenceUrl: bankReferenceUrl.trim(),
            },
          },
        },
      });
      return { success: true as const };
    });
    if (!submission.success) return submission;

    // Log audit
    await logAudit({
      actorId: user.id,
      action: "BID_PAYMENT_SUBMITTED",
      module: "PAYMENTS",
      entityType: "BidPayment",
      newValue: {
        auctionId,
        bidAmount: amount.toFixed(2),
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
    return {
      success: false,
      error: "Failed to submit payment. Please try again.",
    };
  }
}

export async function approveBidPaymentAction(paymentId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const approval = await prisma.$transaction(async (tx) => {
      const paymentReference = await tx.bidPayment.findUnique({
        where: { id: paymentId },
        select: { bid: { select: { auctionId: true } } },
      });
      if (!paymentReference) {
        return { success: false as const, error: "Payment not found." };
      }
      const auctionId = paymentReference.bid.auctionId;
      await tx.$queryRaw`SELECT "id" FROM "Auction" WHERE "id" = ${auctionId} FOR UPDATE`;

      const payment = await tx.bidPayment.findUnique({
        where: { id: paymentId },
        include: { bid: true },
      });
      if (!payment)
        return { success: false as const, error: "Payment not found." };
      if (payment.status !== "PENDING" && payment.status !== "UNDER_REVIEW") {
        return { success: false as const, error: "Payment already processed." };
      }
      if (payment.bid.status !== "PENDING") {
        return { success: false as const, error: "Bid already processed." };
      }

      const [auction, bidder, entryFee, registration] = await Promise.all([
        tx.auction.findUnique({
          where: { id: auctionId },
          include: {
            listing: {
              select: {
                title: true,
                status: true,
                tenantId: true,
                entryFeeStatus: true,
              },
            },
          },
        }),
        tx.user.findUnique({
          where: { id: payment.bid.bidderId },
          select: { id: true, role: true, status: true, deletedAt: true, tenantId: true },
        }),
        tx.buyerAuctionEntryFee.findUnique({
          where: {
            auctionId_buyerId: {
              auctionId,
              buyerId: payment.bid.bidderId,
            },
          },
          select: { status: true },
        }),
        tx.buyerBidRegistration.findUnique({
          where: {
            auctionId_buyerId: {
              auctionId,
              buyerId: payment.bid.bidderId,
            },
          },
          select: { status: true },
        }),
      ]);
      if (!auction)
        return { success: false as const, error: "Auction not found." };
      if (
        !bidder ||
        bidder.role !== "BUYER" ||
        bidder.status !== "ACTIVE" ||
        bidder.deletedAt
      )
        return { success: false as const, error: "This bidder is no longer eligible." };
      if (
        bidder.tenantId &&
        auction.listing.tenantId &&
        bidder.tenantId !== auction.listing.tenantId
      )
        return { success: false as const, error: "This bidder is no longer eligible." };
      if (
        entryFee?.status !== "CONFIRMED" &&
        registration?.status !== "PAID" &&
        registration?.status !== "WAIVED"
      )
        return { success: false as const, error: "The bidder's entrance fee is not approved." };

      const now = new Date();
      const eligibility = bidEligibility(
        {
          auctionStatus: auction.status,
          listingStatus: auction.listing.status,
          entryFeeStatus: auction.listing.entryFeeStatus,
          startAt: auction.startAt,
          endAt: auction.endAt,
        },
        now,
      );
      if (!eligibility.ok)
        return {
          success: false as const,
          error: `The bid can no longer be approved: ${eligibility.message}`,
        };

      const boundary = bidBoundary({
        type: auction.type,
        current: auction.currentHighestBid,
        startingPrice: auction.startingPrice,
        increment: auction.minBidIncrement,
      });
      if (
        !payment.amount.equals(payment.bid.amount) ||
        !isValidBid({
          type: auction.type,
          amount: payment.bid.amount,
          current: auction.currentHighestBid,
          startingPrice: auction.startingPrice,
          increment: auction.minBidIncrement,
        })
      ) {
        return {
          success: false as const,
          error:
            auction.type === "REVERSE"
              ? `This bid is no longer low enough. The current maximum is ${Number(boundary.toFixed(2)).toLocaleString()} ETB.`
              : `This bid is no longer high enough. The current minimum is ${Number(boundary.toFixed(2)).toLocaleString()} ETB.`,
        };
      }

      const newEndAt =
        extendedDeadline({
          endAt: auction.endAt,
          now,
          extensionCount: auction.extensionCount,
        }) ?? auction.endAt;
      const didExtend = newEndAt.getTime() !== auction.endAt.getTime();
      await tx.auction.update({
        where: { id: auctionId },
        data: {
          currentHighestBid: payment.bid.amount,
          highestBidderId: payment.bid.bidderId,
          endAt: newEndAt,
          ...(didExtend ? { extensionCount: { increment: 1 } } : {}),
        },
      });
      if (didExtend) {
        await tx.auctionExtension.create({
          data: {
            auctionId,
            bidId: payment.bidId,
            previousEndAt: auction.endAt,
            newEndAt,
            extensionNo: auction.extensionCount + 1,
          },
        });
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
        auctionId,
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

    return {
      success: true,
      message: "Payment approved and bid is now active.",
    };
  } catch (error) {
    console.error("Approval error:", error);
    return { success: false, error: "Failed to approve payment." };
  }
}

export async function rejectBidPaymentAction(
  paymentId: string,
  reason: string,
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized." };
  }

  try {
    if (!reason.trim()) {
      return { success: false, error: "A rejection reason is required." };
    }

    const paymentReference = await prisma.bidPayment.findUnique({
      where: { id: paymentId },
      select: { bid: { select: { auctionId: true } } },
    });
    if (!paymentReference)
      return { success: false, error: "Payment not found." };
    const rejection = await prisma.$transaction(async (tx) => {
      const auctionId = paymentReference.bid.auctionId;
      await tx.$queryRaw`SELECT "id" FROM "Auction" WHERE "id" = ${auctionId} FOR UPDATE`;
      const payment = await tx.bidPayment.findUnique({
        where: { id: paymentId },
        include: { bid: true },
      });
      if (!payment)
        return { success: false as const, error: "Payment not found." };
      if (payment.status === "APPROVED" || payment.status === "REJECTED")
        return { success: false as const, error: "Payment already processed." };

      const now = new Date();
      await tx.bidPayment.update({
        where: { id: paymentId },
        data: {
          status: "REJECTED",
          verifiedById: user.id,
          verifiedAt: now,
          rejectionReason: reason,
        },
      });
      await tx.bid.update({
        where: { id: payment.bidId },
        data: { status: "REJECTED" },
      });
      return { success: true as const, auctionId, bidId: payment.bidId };
    });
    if (!rejection.success) return rejection;

    // Log audit
    await logAudit({
      actorId: user.id,
      action: "BID_PAYMENT_REJECTED",
      module: "PAYMENTS",
      entityType: "BidPayment",
      entityId: paymentId,
      newValue: { reason, auctionId: rejection.auctionId, bidId: rejection.bidId },
    });

    revalidatePath("/admin");
    revalidatePath(`/auction/${rejection.auctionId}`);
    revalidatePath("/buyer");
    revalidatePath("/customer");

    return { success: true, message: "Bid payment rejected." };
  } catch (error) {
    console.error("Rejection error:", error);
    return { success: false, error: "Failed to reject payment." };
  }
}
