"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify, notifyAdmins } from "@/lib/notify";
import { logAudit } from "@/lib/security";
import {
  bidSchema,
  paymentSettlementSchema,
  ticketSchema,
} from "@/lib/validation";
import { PaymentMethod, TicketPriority, TicketType } from "../generated/prisma/enums";

export async function placeBidAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Please sign in to place a bid." };
  }

  const auctionId = formData.get("auctionId") as string;
  const amountStr = formData.get("amount") as string;
  const amount = parseFloat(amountStr);

  if (!auctionId || isNaN(amount) || amount <= 0) {
    return { success: false, error: "Please enter a valid bid amount." };
  }

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { listing: true, highestBidder: true },
  });

  if (!auction) {
    return { success: false, error: "Auction not found." };
  }

  if (auction.sellerId === user.id) {
    return {
      success: false,
      error: "You cannot bid on your own auction listing.",
    };
  }

  if (auction.status !== "ACTIVE") {
    return {
      success: false,
      error: `This auction is currently ${auction.status.toLowerCase()}. Bids can only be placed on active auctions.`,
    };
  }

  const now = new Date();
  if (now < auction.startAt) {
    return { success: false, error: "This auction has not started yet." };
  }
  if (now > auction.endAt) {
    return { success: false, error: "This auction has already closed." };
  }

  const currentBid = Number(auction.currentHighestBid);
  const minIncrement = Number(auction.minBidIncrement);
  const startingPrice = Number(auction.startingPrice);

  const minimumRequired =
    currentBid > 0 ? currentBid + minIncrement : startingPrice;

  if (amount < minimumRequired) {
    return {
      success: false,
      error: `Your bid must be at least $${minimumRequired.toLocaleString()} (minimum increment of $${minIncrement.toLocaleString()}).`,
    };
  }

  // Soft-close anti-sniping logic: if bid placed in last 5 minutes, extend by 5 minutes
  const timeLeftMs = auction.endAt.getTime() - now.getTime();
  let newEndAt = auction.endAt;
  const softCloseThresholdMs = 5 * 60 * 1000;
  if (timeLeftMs > 0 && timeLeftMs < softCloseThresholdMs) {
    newEndAt = new Date(now.getTime() + softCloseThresholdMs);
  }

  const previousHighestBidderId = auction.highestBidderId;

  // Execute transaction: create bid, update auction highest bid & endAt
  await prisma.$transaction([
    prisma.bid.create({
      data: {
        auctionId: auction.id,
        bidderId: user.id,
        amount,
      },
    }),
    prisma.auction.update({
      where: { id: auction.id },
      data: {
        currentHighestBid: amount,
        highestBidderId: user.id,
        endAt: newEndAt,
      },
    }),
  ]);

  // Outbid notification to previous highest bidder
  if (previousHighestBidderId && previousHighestBidderId !== user.id) {
    await notify(previousHighestBidderId, {
      type: "OUTBID",
      title: "You were outbid!",
      body: `Another bidder placed a bid of $${amount.toLocaleString()} on "${auction.listing.title}". Place a higher bid now to stay in the lead!`,
      link: `/buyer?tab=bids`,
    });
  }

  // Notification to Seller
  await notify(auction.sellerId, {
    type: "NEW_BID",
    title: "New Bid Received",
    body: `${user.name} placed a new highest bid of $${amount.toLocaleString()} on "${auction.listing.title}".`,
    link: `/seller?tab=auctions`,
  });

  // Audit log
  await logAudit({
    actorId: user.id,
    action: "BID_PLACED",
    module: "AUCTIONS",
    entityType: "Auction",
    entityId: auction.id,
    newValue: { amount, bidderId: user.id, newEndAt },
  });

  revalidatePath("/buyer");
  revalidatePath("/customer");
  revalidatePath("/seller");
  revalidatePath("/provider");
  revalidatePath("/");

  return {
    success: true,
    message: `Bid of $${amount.toLocaleString()} placed successfully! You are currently the highest bidder.`,
  };
}

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

  if (!result || result.winningBidderId !== user.id) {
    return {
      success: false,
      error: "Only the winning bidder can submit payment for this auction.",
    };
  }

  const payment = await prisma.payment.create({
    data: {
      auctionResultId,
      payerId: user.id,
      amount: result.depositDue,
      currency: "USD",
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
    body: `Buyer ${user.name} submitted payment ref "${transactionRef}" ($${Number(result.depositDue).toLocaleString()}) for "${result.auction.listing.title}". Verification required.`,
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
  return { success: true };
}
