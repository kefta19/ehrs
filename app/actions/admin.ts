"use server";

import type { AuctionStatus } from "@/app/generated/prisma/enums";
import { allowedTransitions } from "@/lib/auction-state";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { notifyAuctionParticipant } from "@/lib/auction-notifications";
import { logAudit } from "@/lib/security";

const WINNER_SETTLEMENT_WINDOW_MS = 72 * 60 * 60 * 1000;

export async function updateAuctionStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const auctionId = formData.get("auctionId") as string;
  const status = formData.get("status") as AuctionStatus;

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { listing: true },
  });
  if (!auction) return { success: false, error: "Auction not found." };

  if (auction.status === "PENDING_APPROVAL")
    return {
      success: false,
      error:
        "Use Approve / Reject in the Listings tab to review new submissions.",
    };
  if (!allowedTransitions(auction.status, "ADMIN").includes(status))
    return {
      success: false,
      error: `An auction cannot move from ${auction.status} to ${status}.`,
    };

  const next: AuctionStatus =
    status === "ACTIVE" && auction.startAt > new Date() ? "SCHEDULED" : status;

  await prisma.auction.update({
    where: { id: auctionId },
    data: { status: next, approvedById: user.id },
  });

  await logAudit({
    actorId: user.id,
    action: `AUCTION_${next}`,
    module: "AUCTIONS",
    entityType: "Auction",
    entityId: auctionId,
    newValue: { status: next },
  });
  await notify(auction.sellerId, {
    type: "AUCTION_STATUS_CHANGED",
    title: `Auction status: ${next}`,
    body: `Your auction for "${auction.listing.title}" is now ${next}.`,
    link: "/seller",
  });

  revalidatePath("/admin");
  revalidatePath("/seller");
  revalidatePath("/buyer");
  revalidatePath("/");
  return { success: true, message: `Auction status set to ${next}.` };
}

import { syncAuctionStatuses } from "@/lib/auction-lifecycle";

export async function reviewListingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const listingId = formData.get("listingId") as string;
  const status = formData.get("status") as "APPROVED" | "REJECTED";
  const rejectionReason = (formData.get("rejectionReason") as string) || "";

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      seller: true,
      auctions: { orderBy: { createdAt: "desc" } },
      entryFees: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!listing) return { success: false, error: "Listing not found." };

  const now = new Date();

  if (status === "APPROVED") {
    // 1. Approve listing & confirm entry fee
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: "APPROVED",
        entryFeeStatus: "CONFIRMED",
        reviewedById: user.id,
        reviewedAt: now,
        rejectionReason: null,
      },
    });

    // 2. Confirm any entry fee records
    await prisma.auctionEntryFee.updateMany({
      where: { listingId },
      data: {
        status: "CONFIRMED",
        confirmedAt: now,
        verifiedById: user.id,
      },
    });

    // 3. Set auction(s) to ACTIVE (Live Bid!)
    const auctions = listing.auctions;
    if (auctions.length > 0) {
      for (const a of auctions) {
        const endAt =
          a.endAt <= now
            ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
            : a.endAt;

        await prisma.auction.update({
          where: { id: a.id },
          data: {
            status: "ACTIVE",
            startAt: a.startAt > now ? now : a.startAt,
            endAt,
            approvedById: user.id,
          },
        });
      }
    }

    await syncAuctionStatuses(now);

    await logAudit({
      actorId: user.id,
      action: "LISTING_AND_AUCTION_APPROVED_LIVE",
      module: "LISTINGS",
      entityType: "Listing",
      entityId: listingId,
      newValue: { status: "APPROVED", auctionStatus: "ACTIVE" },
    });

    await notify(listing.sellerId, {
      type: "LISTING_APPROVED",
      title: "Listing Approved & Live!",
      body: `Your listing "${listing.title}" and entry fee have been verified. It is now LIVE for public bidding!`,
      link: `/seller`,
    });
  } else {
    // REJECTED
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: "REJECTED",
        reviewedById: user.id,
        rejectionReason: rejectionReason || "Please verify documentation and resubmit.",
        reviewedAt: now,
      },
    });

    await prisma.auction.updateMany({
      where: {
        listingId,
        status: { in: ["PENDING_APPROVAL", "SCHEDULED"] },
      },
      data: { status: "DRAFT" },
    });

    await logAudit({
      actorId: user.id,
      action: "LISTING_REJECTED",
      module: "LISTINGS",
      entityType: "Listing",
      entityId: listingId,
      newValue: { status: "REJECTED", rejectionReason },
    });

    await notify(listing.sellerId, {
      type: "LISTING_REJECTED",
      title: "Listing Verification Rejected",
      body: `Your listing "${listing.title}" was rejected. Reason: ${rejectionReason || "Please verify documentation and resubmit."}`,
      link: `/seller`,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/seller");
  revalidatePath("/provider");
  revalidatePath("/buyer");
  revalidatePath("/");
  if (listing.auctions[0]) {
    revalidatePath(`/auction/${listing.auctions[0].id}`);
  }

  return {
    success: true,
    message:
      status === "APPROVED"
        ? `Listing approved and published to Live Bidding!`
        : `Listing marked as REJECTED.`,
  };
}

export async function verifyPaymentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const paymentId = formData.get("paymentId") as string;
  const status = formData.get("status") as any; // PAID, REFUNDED, FAILED
  const notes = (formData.get("notes") as string) || "";

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      auctionResult: { include: { auction: { include: { listing: true } } } },
      payer: true,
    },
  });

  if (!payment) return { success: false, error: "Payment record not found." };

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status,
      verifiedById: user.id,
      notes: notes || payment.notes,
      paidAt: status === "PAID" ? new Date() : payment.paidAt,
    },
  });

  if (status === "PAID") {
    await prisma.auctionResult.update({
      where: { id: payment.auctionResultId },
      data: { isSettled: true },
    });
    await prisma.auction.update({
      where: { id: payment.auctionResult.auctionId },
      data: { status: "COMPLETED" },
    });
  }

  await logAudit({
    actorId: user.id,
    action: `PAYMENT_${status}`,
    module: "PAYMENTS",
    entityType: "Payment",
    entityId: paymentId,
    newValue: { status, notes },
  });

  await notify(payment.payerId, {
    type: `PAYMENT_${status}`,
    title:
      status === "PAID"
        ? "Payment Confirmed & Verified!"
        : `Payment Status: ${status}`,
    body:
      status === "PAID"
        ? `Your payment of ${Number(payment.amount).toLocaleString()} ETB for "${payment.auctionResult.auction.listing.title}" has been verified in escrow.`
        : `Your payment was updated to ${status}. Notes: ${notes || "Contact billing for details."}`,
    link: `/buyer?tab=payments`,
  });

  revalidatePath("/admin");
  revalidatePath("/buyer");
  return { success: true, message: `Payment updated to ${status}.` };
}

export async function updateTicketStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const ticketId = formData.get("ticketId") as string;
  const status = formData.get("status") as any; // UNDER_INVESTIGATION, RESOLVED, CLOSED
  const resolution = (formData.get("resolution") as string) || "";

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) return { success: false, error: "Ticket not found." };

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status,
      assignedToId: user.id,
      resolution: resolution || ticket.resolution,
      resolvedAt:
        status === "RESOLVED" || status === "CLOSED"
          ? new Date()
          : ticket.resolvedAt,
    },
  });

  await logAudit({
    actorId: user.id,
    action: `TICKET_${status}`,
    module: "TICKETS",
    entityType: "Ticket",
    entityId: ticketId,
    newValue: { status, resolution },
  });

  await notify(ticket.createdById, {
    type: `TICKET_${status}`,
    title: `Ticket ${ticket.number} ${status}`,
    body: `Your ticket has been updated: ${resolution || `Status changed to ${status}.`}`,
    link: `/buyer?tab=tickets`,
  });

  revalidatePath("/admin");
  revalidatePath("/buyer");
  return { success: true, message: `Ticket updated to ${status}.` };
}

export async function updateUserStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const targetUserId = formData.get("userId") as string;
  const status = formData.get("status") as any; // ACTIVE, SUSPENDED, DEACTIVATED
  const role = formData.get("role") as any; // BUYER, SELLER, ADMIN

  if (targetUserId === user.id && status !== "ACTIVE") {
    return {
      success: false,
      error: "You cannot suspend or deactivate your own admin account.",
    };
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      status: status || undefined,
      role: role || undefined,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "USER_MODIFIED",
    module: "USERS",
    entityType: "User",
    entityId: targetUserId,
    newValue: { status, role },
  });

  revalidatePath("/admin");
  return { success: true, message: "User status updated successfully." };
}

export async function manageCategoryAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const slug = (formData.get("slug") as string).toLowerCase().trim();
  const name = formData.get("name") as string;
  const icon = formData.get("icon") as string;
  const description = formData.get("description") as string;

  if (!slug || !name) {
    return { success: false, error: "Slug and name are required." };
  }

  await prisma.category.upsert({
    where: { slug },
    create: {
      slug,
      name,
      icon: icon || "📦",
      description,
      isActive: true,
    },
    update: {
      name,
      icon: icon || undefined,
      description,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, message: `Category "${name}" saved.` };
}

export async function updateSystemSettingsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const settings: Record<string, string> = {
    "system.name": formData.get("systemName") as string,
    "system.currency": formData.get("currency") as string,
    "auction.softCloseMinutes": formData.get("softCloseMinutes") as string,
    "auction.depositPercent": formData.get("depositPercent") as string,
    "platform.commissionPercent": formData.get("commissionPercent") as string,
  };

  for (const [key, value] of Object.entries(settings)) {
    if (value !== null && value !== undefined && value !== "") {
      await prisma.systemSetting.upsert({
        where: { key },
        create: {
          key,
          value: isNaN(Number(value)) ? value : Number(value),
          updatedById: user.id,
        },
        update: {
          value: isNaN(Number(value)) ? value : Number(value),
          updatedById: user.id,
        },
      });
    }
  }

  await logAudit({
    actorId: user.id,
    action: "SETTINGS_UPDATED",
    module: "SETTINGS",
    entityType: "SystemSetting",
    newValue: settings,
  });

  revalidatePath("/admin");
  return { success: true, message: "System settings saved successfully." };
}

export async function verifySellerKycAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const sellerProfileId = formData.get("sellerProfileId") as string;
  const status = formData.get("status") as "APPROVED" | "REJECTED";
  const reviewNote = (formData.get("reviewNote") as string) || "";

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { id: sellerProfileId },
  });

  if (!sellerProfile) return { success: false, error: "Seller profile not found." };

  await prisma.sellerProfile.update({
    where: { id: sellerProfileId },
    data: {
      status: status === "APPROVED" ? "APPROVED" : "REJECTED",
      reviewNote,
      reviewedAt: new Date(),
      reviewedById: user.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: `SELLER_KYC_${status}`,
    module: "KYC",
    entityType: "SellerProfile",
    entityId: sellerProfileId,
    newValue: { status, reviewNote },
  });

  await notify(sellerProfile.userId, {
    type: `SELLER_KYC_${status}`,
    title: status === "APPROVED" ? "Seller Verification Approved!" : "Seller Verification Rejected",
    body:
      status === "APPROVED"
        ? "Your seller identity verification has been approved. You can now create listings."
        : `Your seller identity verification was rejected. Reason: ${reviewNote || "Please resubmit with correct documentation."}`,
    link: "/seller",
  });

  revalidatePath("/admin");
  revalidatePath("/seller");
  return { success: true, message: `Seller KYC ${status.toLowerCase()}.` };
}

export async function reviewAuctionWinnerAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return { success: false, error: "Unauthorized." };

  const resultId = formData.get("resultId");
  const decision = formData.get("decision");
  if (typeof resultId !== "string" || !resultId.trim())
    return { success: false, error: "Auction result could not be identified." };
  if (decision !== "APPROVED" && decision !== "REJECTED")
    return { success: false, error: "Choose an approval decision." };

  try {
    const resultReference = await prisma.auctionResult.findUnique({
      where: { id: resultId },
      select: { auctionId: true },
    });
    if (!resultReference)
      return { success: false, error: "Auction result not found." };

    const review = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Auction" WHERE "id" = ${resultReference.auctionId} FOR UPDATE`;
      const result = await tx.auctionResult.findUnique({
        where: { id: resultId },
        include: {
          auction: {
            include: {
              listing: {
                select: { id: true, title: true, tenantId: true },
              },
            },
          },
          winningBidder: {
            select: { id: true, name: true, role: true, status: true, deletedAt: true, tenantId: true },
          },
        },
      });
      if (!result)
        return { success: false as const, error: "Auction result not found." };
      if (result.winnerReviewStatus !== "PENDING")
        return { success: false as const, error: "This winner has already been reviewed." };
      if (!result.reserveMet)
        return { success: false as const, error: "The reserve was not met, so there is no winner to approve." };

      const now = new Date();
      if (decision === "APPROVED") {
        const [eligibleBid, entryFee, registration] = await Promise.all([
          tx.bid.findFirst({
            where: {
              auctionId: result.auctionId,
              bidderId: result.winningBidderId,
              amount: result.winningAmount,
              status: "APPROVED",
            },
            select: { id: true },
          }),
          tx.buyerAuctionEntryFee.findUnique({
            where: {
              auctionId_buyerId: {
                auctionId: result.auctionId,
                buyerId: result.winningBidderId,
              },
            },
            select: { status: true },
          }),
          tx.buyerBidRegistration.findUnique({
            where: {
              auctionId_buyerId: {
                auctionId: result.auctionId,
                buyerId: result.winningBidderId,
              },
            },
            select: { status: true },
          }),
        ]);
        if (
          result.winningBidder.role !== "BUYER" ||
          result.winningBidder.status !== "ACTIVE" ||
          result.winningBidder.deletedAt ||
          (result.winningBidder.tenantId &&
            result.auction.listing.tenantId &&
            result.winningBidder.tenantId !== result.auction.listing.tenantId) ||
          (!eligibleBid ||
            (entryFee?.status !== "CONFIRMED" &&
              registration?.status !== "PAID" &&
              registration?.status !== "WAIVED"))
        )
          return {
            success: false as const,
            error: "The proposed winner is no longer an eligible, approved participant.",
          };
      }

      const settlementDeadline =
        decision === "APPROVED"
          ? new Date(now.getTime() + WINNER_SETTLEMENT_WINDOW_MS)
          : result.settlementDeadline;
      await tx.auctionResult.update({
        where: { id: resultId },
        data: {
          winnerReviewStatus: decision,
          winnerReviewedAt: now,
          winnerReviewedById: user.id,
          ...(decision === "APPROVED" ? { settlementDeadline } : {}),
        },
      });
      if (decision === "APPROVED") {
        await tx.listing.update({
          where: { id: result.auction.listing.id },
          data: { status: "AUCTIONED" },
        });
      }
      return {
        success: true as const,
        auctionId: result.auctionId,
        auctionTitle: result.auction.listing.title,
        sellerId: result.auction.sellerId,
        winnerId: result.winningBidderId,
        winnerName: result.winningBidder.name,
        winningAmount: result.winningAmount.toString(),
        depositDue: result.depositDue.toString(),
        settlementDeadline,
      };
    });
    if (!review.success) return review;

    await logAudit({
      actorId: user.id,
      action: `AUCTION_WINNER_${decision}`,
      module: "AUCTIONS",
      entityType: "AuctionResult",
      entityId: resultId,
      newValue: {
        auctionId: review.auctionId,
        winnerId: review.winnerId,
        decision,
      },
    });
    if (decision === "APPROVED") {
      await notifyAuctionParticipant(review.winnerId, {
        type: "AUCTION_WON",
        title: "Your auction result is approved",
        body: `Your winning bid for "${review.auctionTitle}" was ${Number(review.winningAmount).toLocaleString()} ETB. Pay the required deposit of ${Number(review.depositDue).toLocaleString()} ETB by ${review.settlementDeadline.toLocaleString()} (within 72 hours).`,
        link: "/buyer?tab=payments",
      });
      await notify(review.sellerId, {
        type: "AUCTION_WINNER_APPROVED",
        title: "Auction winner approved",
        body: `The administrator approved ${review.winnerName} as the winner for "${review.auctionTitle}".`,
        link: "/seller?tab=auctions",
      });
    } else {
      await notify(review.winnerId, {
        type: "AUCTION_WINNER_REJECTED",
        title: "Auction winner not approved",
        body: `The proposed winner for "${review.auctionTitle}" was not approved by an administrator.`,
        link: "/buyer",
      });
    }

    revalidatePath("/admin");
    revalidatePath("/buyer");
    revalidatePath("/customer");
    revalidatePath("/seller");
    revalidatePath(`/auction/${review.auctionId}`);
    return {
      success: true,
      message: `Auction winner ${decision.toLowerCase()}.`,
    };
  } catch (error) {
    console.error("[reviewAuctionWinnerAction]", error);
    return {
      success: false,
      error: "Could not review the auction winner. Refresh and try again.",
    };
  }
}