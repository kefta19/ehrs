"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify, notifyAdmins } from "@/lib/notify";
import { notifyAuctionParticipant } from "@/lib/auction-notifications";
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

  // Check if buyer has paid entrance fee
  const buyerEntryFee = await prisma.buyerAuctionEntryFee.findUnique({
    where: {
      auctionId_buyerId: {
        auctionId: auctionId,
        buyerId: user.id,
      },
    },
  });

  const buyerReg = await prisma.buyerBidRegistration.findUnique({
    where: {
      auctionId_buyerId: {
        auctionId: auctionId,
        buyerId: user.id,
      },
    },
  });

  const isFeePaid =
    (buyerEntryFee && buyerEntryFee.status === "CONFIRMED") ||
    (buyerReg && (buyerReg.status === "PAID" || buyerReg.status === "WAIVED"));

  if (!isFeePaid) {
    return {
      success: false,
      error: "You must pay the service entrance fee before placing or increasing a bid on this listing.",
    };
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

  const participants = await prisma.bid.findMany({
    where: { auctionId: auction.id },
    select: { bidderId: true },
    distinct: ["bidderId"],
  });
  await Promise.all(
    participants.map(({ bidderId }) =>
      notifyAuctionParticipant(bidderId, {
        type: "AUCTION_BID_UPDATE",
        title:
          bidderId === previousHighestBidderId && bidderId !== user.id
            ? "You were outbid"
            : bidderId === user.id
              ? "Your bid was recorded"
              : "New bid placed",
        body:
          bidderId === previousHighestBidderId && bidderId !== user.id
            ? `A new bid of $${amount.toLocaleString()} was placed on "${auction.listing.title}". You are no longer the highest bidder.`
            : bidderId === user.id
              ? `Your bid of $${amount.toLocaleString()} on "${auction.listing.title}" was recorded.`
              : `A new bid of $${amount.toLocaleString()} was placed on "${auction.listing.title}".`,
        link: `/auction/${auction.id}`,
      }),
    ),
  );

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
  revalidatePath(`/auction/${auction.id}`);

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
