"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { notify, notifyAdmins } from "@/lib/notify";
import { notifyAuctionParticipant } from "@/lib/auction-notifications";
import {
  bidBoundary,
  extendedDeadline,
  isValidBid,
} from "@/lib/auction-bidding";
import { bidEligibility } from "@/lib/auction-eligibility";
import { logAudit, rateLimit } from "@/lib/security";
import {
  bidSchema,
  paymentSettlementSchema,
  ticketSchema,
} from "@/lib/validation";
import { PaymentMethod, TicketPriority, TicketType } from "../generated/prisma/enums";

export async function toggleWatchlistAction(auctionId: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Please sign in." };

  const existing = await prisma.watchlistItem.findUnique({
    where: {
      userId_auctionId: {
        userId: user.id,
        auctionId,
      },
    },
  });

  if (existing) {
    await prisma.watchlistItem.delete({
      where: { id: existing.id },
    });
    revalidatePath("/buyer");
    revalidatePath("/customer");
    return { success: true, isWatched: false };
  } else {
    await prisma.watchlistItem.create({
      data: {
        userId: user.id,
        auctionId,
      },
    });
    revalidatePath("/buyer");
    revalidatePath("/customer");
    return { success: true, isWatched: true };
  }
}

export async function placeBuyerBidAction(auctionId: string, amountInput: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "BUYER") {
    return { success: false as const, error: "Only signed-in buyers can bid." };
  }
  if (!auctionId || !/^\d{1,12}(\.\d{1,2})?$/.test(amountInput.trim())) {
    return { success: false as const, error: "Enter a valid bid amount." };
  }
  if (!rateLimit(`buyer-bid:${user.id}`, 10, 60_000)) {
    return {
      success: false as const,
      error: "Too many bids. Please wait a moment before bidding again.",
    };
  }

  const requestedAmount = new Prisma.Decimal(amountInput.trim());

  try {
    const result = await prisma.$transaction(async (tx) => {
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

      if (!auction) {
        return { success: false as const, error: "Auction not found." };
      }
      if (
        user.tenantId &&
        auction.listing.tenantId &&
        user.tenantId !== auction.listing.tenantId
      ) {
        return { success: false as const, error: "Auction not found." };
      }
      if (auction.sellerId === user.id) {
        return { success: false as const, error: "You cannot bid on your own auction." };
      }

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

      const [entryFee, registration, pendingBid] = await Promise.all([
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
      ) {
        return {
          success: false as const,
          error: "Your entrance fee must be approved before you can bid.",
        };
      }
      if (pendingBid) {
        return {
          success: false as const,
          error: "A previous bid is still under review. Wait for its review before bidding again.",
        };
      }

      const amount = requestedAmount;
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
      ) {
        return {
          success: false as const,
          error:
            auction.type === "REVERSE"
              ? `Your bid must be no more than ${Number(boundary.toFixed(2)).toLocaleString()} ETB.`
              : `Your bid must be at least ${Number(boundary.toFixed(2)).toLocaleString()} ETB.`,
        };
      }

      const endAt =
        extendedDeadline({
          endAt: auction.endAt,
          now,
          extensionCount: auction.extensionCount,
        }) ?? auction.endAt;
      const didExtend = endAt.getTime() !== auction.endAt.getTime();

      const bid = await tx.bid.create({
        data: {
          auctionId,
          bidderId: user.id,
          amount,
          status: "APPROVED",
          approvedAt: now,
        },
        select: { id: true, createdAt: true },
      });
      if (didExtend) {
        await tx.auctionExtension.create({
          data: {
            auctionId,
            bidId: bid.id,
            previousEndAt: auction.endAt,
            newEndAt: endAt,
            extensionNo: auction.extensionCount + 1,
          },
        });
      }
      await tx.auction.update({
        where: { id: auctionId },
        data: {
          currentHighestBid: amount,
          highestBidderId: user.id,
          endAt,
          ...(didExtend ? { extensionCount: { increment: 1 } } : {}),
        },
      });

      return {
        success: true as const,
        amount: Number(amount),
        endAt: endAt.toISOString(),
        bidId: bid.id,
        createdAt: bid.createdAt.toISOString(),
        previousBidderId: auction.highestBidderId,
        sellerId: auction.sellerId,
        title: auction.listing.title,
        type: auction.type,
      };
    });

    if (!result.success) return result;

    const participants = await prisma.bid.findMany({
      where: { auctionId, status: "APPROVED" },
      select: { bidderId: true },
      distinct: ["bidderId"],
    });
    const notificationResults = await Promise.allSettled([
      ...participants.map(({ bidderId }) =>
        notifyAuctionParticipant(bidderId, {
          type: "AUCTION_BID_UPDATE",
          title:
            bidderId === user.id
              ? "Your bid was updated"
              : bidderId === result.previousBidderId
                ? "You were outbid"
                : "New bid placed",
          body:
            bidderId === user.id
              ? `Your bid of ${result.amount.toLocaleString()} ETB on "${result.title}" is now the ${result.type === "REVERSE" ? "lowest" : "highest"} bid.`
              : bidderId === result.previousBidderId
                ? `A new bid of ${result.amount.toLocaleString()} ETB was placed on "${result.title}". You are no longer the current ${result.type === "REVERSE" ? "lowest" : "highest"} bidder.`
                : `A new bid of ${result.amount.toLocaleString()} ETB was placed on "${result.title}".`,
          link: `/auction/${auctionId}`,
        }),
      ),
      notify(result.sellerId, {
        type: "NEW_BID",
        title: "New bid received",
        body: `${user.name} placed a new ${result.type === "REVERSE" ? "lowest" : "highest"} bid of ${result.amount.toLocaleString()} ETB on "${result.title}".`,
        link: "/seller?tab=auctions",
      }),
      notifyAdmins({
        type: "NEW_BID",
        title: "Auction bid updated",
        body: `${user.name} placed a new ${result.type === "REVERSE" ? "lowest" : "highest"} bid of ${result.amount.toLocaleString()} ETB on "${result.title}".`,
        link: "/admin?tab=auctions",
      }),
    ]);
    notificationResults.forEach((notificationResult) => {
      if (notificationResult.status === "rejected") {
        console.error(
          "Failed to send a bid update notification:",
          notificationResult.reason,
        );
      }
    });

    await logAudit({
      actorId: user.id,
      action: "BID_PLACED",
      module: "BIDS",
      entityType: "Auction",
      entityId: auctionId,
      newValue: { amount: result.amount, endAt: result.endAt },
    });
    revalidatePath("/customer");
    revalidatePath("/buyer");
    revalidatePath("/seller");
    revalidatePath(`/auction/${auctionId}`);

    return {
      success: true as const,
      amount: result.amount,
      endAt: result.endAt,
      bidId: result.bidId,
      createdAt: result.createdAt,
      message: `Your bid of ${result.amount.toLocaleString()} ETB is now the current ${result.type === "REVERSE" ? "lowest" : "highest"} bid.`,
    };
  } catch (error) {
    console.error("Buyer bid error:", error);
    return {
      success: false as const,
      error: "Could not update your bid. Please refresh and try again.",
    };
  }
}

export async function submitPaymentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const auctionResultId = formData.get("auctionResultId") as string;
  const rawMethod = (formData.get("method") as string | null) ?? "BANK_TRANSFER";
  const method: PaymentMethod =
    rawMethod === "CARD" || rawMethod === "BANK_TRANSFER" || rawMethod === "ESCROW_WALLET"
      ? rawMethod
      : "BANK_TRANSFER";
  const transactionRef = formData.get("transactionRef") as string;
  const receiptUrl = (formData.get("receiptUrl") as string | null) ?? "";
  const notes = (formData.get("notes") as string | null) ?? "";

  if (!auctionResultId || !transactionRef) {
    return {
      success: false,
      error: "Auction result and transaction reference are required.",
    };
  }

  const result = await prisma.auctionResult.findUnique({
    where: { id: auctionResultId },
    include: { auction: { include: { listing: true } } },
  });

  if (
    !result ||
    result.winningBidderId !== user.id ||
    result.winnerReviewStatus !== "APPROVED" ||
    !result.reserveMet
  ) {
    return {
      success: false,
      error: "Only an administrator-approved winner can submit payment for this auction.",
    };
  }

  const payment = await prisma.payment.create({
    data: {
      auctionResultId,
      payerId: user.id,
      amount: result.depositDue,
      currency: "ETB",
      method,
      status: "PENDING",
      transactionRef,
      receiptUrl,
      notes,
    },
  });

  await notifyAdmins({
    type: "PAYMENT_SUBMITTED",
    title: "New Escrow Payment Submitted",
    body: `Buyer ${user.name} submitted payment ref "${transactionRef}" (${Number(result.depositDue).toLocaleString()} ETB) for "${result.auction.listing.title}". Verification required.`,
    link: `/admin?tab=payments`,
  });

  await logAudit({
    actorId: user.id,
    action: "PAYMENT_SUBMITTED",
    module: "PAYMENTS",
    entityType: "Payment",
    entityId: payment.id,
    newValue: { amount: result.depositDue, method, transactionRef },
  });

  revalidatePath("/buyer");
  revalidatePath("/customer");
  return {
    success: true,
    message:
      "Payment proof submitted successfully. Platform admin will verify your deposit shortly.",
  };
}

export async function submitAuctionInquiryAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "BUYER") {
    return { success: false, error: "Sign in with a buyer account to contact the seller." };
  }

  const auctionId = formData.get("auctionId");
  const messageValue = formData.get("message");
  const message =
    typeof messageValue === "string" ? messageValue.trim() : "";

  if (typeof auctionId !== "string" || !auctionId) {
    return { success: false, error: "This auction could not be identified." };
  }
  if (message.length < 10 || message.length > 2000) {
    return {
      success: false,
      error: "Your message must be between 10 and 2,000 characters.",
    };
  }

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: {
      id: true,
      sellerId: true,
      status: true,
      listing: { select: { title: true, status: true } },
    },
  });

  if (!auction || auction.listing.status !== "APPROVED") {
    return { success: false, error: "This listing is not available." };
  }
  if (auction.sellerId === user.id) {
    return { success: false, error: "You cannot contact yourself about your own listing." };
  }
  if (!["ACTIVE", "SCHEDULED", "CLOSED", "COMPLETED"].includes(auction.status)) {
    return { success: false, error: "This auction is not accepting inquiries." };
  }

  const [registration, entryFee] = await Promise.all([
    prisma.buyerBidRegistration.findUnique({
      where: { auctionId_buyerId: { auctionId, buyerId: user.id } },
      select: { status: true },
    }),
    prisma.buyerAuctionEntryFee.findUnique({
      where: { auctionId_buyerId: { auctionId, buyerId: user.id } },
      select: { status: true },
    }),
  ]);
  const hasPaidEntranceFee =
    registration?.status === "PAID" ||
    registration?.status === "WAIVED" ||
    entryFee?.status === "CONFIRMED";

  if (!hasPaidEntranceFee) {
    return {
      success: false,
      error: "Complete the auction entrance-fee requirement before contacting the seller.",
    };
  }

  let number: string | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await prisma.ticket.count();
    const candidate = `TK-${(10000 + count + attempt + 1).toString()}`;
    const existing = await prisma.ticket.findUnique({
      where: { number: candidate },
      select: { id: true },
    });
    if (!existing) {
      number = candidate;
      break;
    }
  }

  if (!number) {
    throw new Error("Unable to generate a unique inquiry number.");
  }

  const subject = `Auction inquiry: ${auction.listing.title}`.slice(0, 200);
  const ticket = await prisma.ticket.create({
    data: {
      number,
      type: TicketType.SUPPORT,
      subject,
      description: `Buyer: ${user.name} <${user.email}>\n\n${message}`,
      priority: TicketPriority.NORMAL,
      status: "OPEN",
      createdById: user.id,
      againstUserId: auction.sellerId,
      auctionId: auction.id,
    },
    select: { id: true, number: true },
  });

  await notify(auction.sellerId, {
    type: "AUCTION_INQUIRY",
    title: "New buyer inquiry",
    body: `${user.name} (${user.email}) asked about "${auction.listing.title}": ${message}`,
    link: `/seller?tab=notifications&inquiryId=${encodeURIComponent(ticket.id)}`,
  });

  revalidatePath("/buyer");
  revalidatePath("/customer");
  revalidatePath("/seller");

  return {
    success: true,
    message: `Inquiry ${ticket.number} sent to the seller.`,
  };
}

export async function submitComplaintTicketAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const rawType = (formData.get("type") as string | null) || "COMPLAINT";
  const type: TicketType =
    rawType === "SUPPORT" || rawType === "COMPLAINT" || rawType === "PROBLEM_REPORT" || rawType === "DISPUTE"
      ? rawType
      : "COMPLAINT";
  const subject = formData.get("subject") as string;
  const description = formData.get("description") as string;
  const auctionId = (formData.get("auctionId") as string) || undefined;
  const rawPriority = (formData.get("priority") as string | null) || "NORMAL";
  const priority: TicketPriority =
    rawPriority === "LOW" || rawPriority === "NORMAL" || rawPriority === "HIGH" || rawPriority === "URGENT"
      ? rawPriority
      : "NORMAL";

  if (!subject || !description) {
    return { success: false, error: "Subject and description are required." };
  }

  let number: string | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await prisma.ticket.count();
    const candidate = `TK-${(10000 + count + attempt + 1).toString()}`;
    const existing = await prisma.ticket.findUnique({
      where: { number: candidate },
      select: { id: true },
    });

    if (!existing) {
      number = candidate;
      break;
    }
  }

  if (!number) {
    throw new Error("Unable to generate a unique support ticket number.");
  }

  await prisma.ticket.create({
    data: {
      number,
      type,
      subject,
      description,
      priority,
      status: "OPEN",
      createdById: user.id,
      auctionId: auctionId || undefined,
    },
  });

  await notifyAdmins({
    type: "TICKET_OPENED",
    title: `New Support Ticket ${number}`,
    body: `${user.name} submitted ticket "${subject}": ${description.slice(0, 100)}...`,
    link: `/admin?tab=tickets`,
  });

  revalidatePath("/buyer");
  revalidatePath("/customer");
  return {
    success: true,
    message: `Ticket ${number} created. Support will review and contact you.`,
  };
}

export async function updateBuyerProfileAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const address = formData.get("address") as string;
  const preferredLocation = formData.get("preferredLocation") as string;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: name || user.name,
      phone: phone || user.phone,
    },
  });

  await prisma.buyerProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      address,
      preferredLocation,
      isVerified: true,
    },
    update: {
      address,
      preferredLocation,
    },
  });

  revalidatePath("/buyer");
  revalidatePath("/customer");
  return { success: true, message: "Profile updated successfully." };
}

export async function markNotificationReadAction(notificationId: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false };

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { readAt: new Date() },
  });

  revalidatePath("/buyer");
  revalidatePath("/customer");
  revalidatePath("/seller");
  revalidatePath("/provider");
  return { success: true };
}

export async function deleteNotificationAction(notificationId: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };
  if (!notificationId) {
    return { success: false, error: "Notification ID is required." };
  }

  await prisma.notification.deleteMany({
    where: { id: notificationId, userId: user.id },
  });

  revalidatePath("/buyer");
  revalidatePath("/customer");
  revalidatePath("/seller");
  revalidatePath("/provider");
  revalidatePath("/admin");
  return { success: true };
}

// Buyer entrance fee payment
export async function payBuyerEntranceFeeAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Please sign in to pay entrance fee." };

  const auctionId = formData.get("auctionId") as string;
  const method = formData.get("method") as "CHAPA" | "BANK_TRANSFER";

  if (!auctionId) {
    return { success: false, error: "Auction ID is required." };
  }

  if (!method || (method !== "CHAPA" && method !== "BANK_TRANSFER")) {
    return { success: false, error: "Invalid payment method." };
  }

  // Check if auction exists and is approved
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { listing: true },
  });

  if (!auction) {
    return { success: false, error: "Auction not found." };
  }

  if (auction.listing.status !== "APPROVED") {
    return { success: false, error: "This auction is not yet approved." };
  }

  // Check if user already paid entrance fee
  const existingFee = await prisma.buyerAuctionEntryFee.findUnique({
    where: {
      auctionId_buyerId: {
        auctionId,
        buyerId: user.id,
      },
    },
  });

  if (existingFee && existingFee.status === "CONFIRMED") {
    return { success: false, error: "You have already paid the entrance fee for this auction." };
  }

  // Create entrance fee record
  const { ensureBuyerEntranceFee } = await import("@/lib/buyer-entrance-fee-service");
  const fee = await prisma.$transaction(async (tx) => {
    return await ensureBuyerEntranceFee(tx, auctionId, user.id);
  });

  if (method === "CHAPA") {
    // For Chapa, return the checkout URL (this would integrate with Chapa API)
    // For now, return a placeholder response
    return {
      success: true,
      message: "Entrance fee record created. Chapa integration pending.",
      feeId: fee.id,
      txRef: fee.txRef,
      amount: Number(fee.amount),
      currency: fee.currency,
    };
  } else if (method === "BANK_TRANSFER") {
    // For bank transfer, return bank details
    return {
      success: true,
      message: "Please use the transaction reference for your bank transfer.",
      feeId: fee.id,
      txRef: fee.txRef,
      amount: Number(fee.amount),
      currency: fee.currency,
      bankDetails: {
        accountName: "EHRS Auction Platform",
        accountNumber: "1000123456789",
        bank: "Commercial Bank of Ethiopia",
        branch: "Bole Branch",
      },
    };
  }

  return { success: false, error: "Payment method not implemented." };
}
