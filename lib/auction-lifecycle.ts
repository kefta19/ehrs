import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { notifyAuctionParticipant } from "@/lib/auction-notifications";
import { logAudit } from "@/lib/security";

import { deleteFile } from "@/lib/storage";

const SETTLEMENT_WINDOW_MS = 72 * 60 * 60 * 1000;

/**
 * SCHEDULED --(startAt reached)--> ACTIVE
 * ACTIVE    --(endAt reached)----> CLOSED (+ AuctionResult if there are bids)
 */
export async function syncAuctionStatuses(now: Date = new Date()) {
  const activated = await prisma.auction.updateMany({
    where: { status: "SCHEDULED", startAt: { lte: now } },
    data: { status: "ACTIVE" },
  });

  const due = await prisma.auction.findMany({
    where: { status: "ACTIVE", endAt: { lte: now } },
    select: { id: true },
    take: 100,
  });

  let closed = 0;
  for (const { id } of due) {
    try {
      if (await closeAuction(id, now)) closed++;
    } catch (err) {
      console.error(`[auction-lifecycle] failed to close ${id}`, err);
    }
  }
  const reminders = await sendSettlementReminders(now);
  return { activated: activated.count, closed, ...reminders };
}

async function sendSettlementReminders(now: Date) {
  const upcomingDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const reminders = [
    {
      field: "reminder24hSentAt" as const,
      where: {
        settlementDeadline: { gt: now, lte: upcomingDeadline },
        reminder24hSentAt: null,
      },
      title: "Deposit due in 24 hours",
      body: (title: string, amount: string, deadline: Date) =>
        `Your deposit of $${amount} for "${title}" is due within 24 hours, by ${deadline.toLocaleString()}.`,
    },
    {
      field: "deadlineSentAt" as const,
      where: {
        settlementDeadline: { lte: now },
        deadlineSentAt: null,
      },
      title: "Deposit deadline reached",
      body: (title: string, amount: string, deadline: Date) =>
        `The deposit deadline for "${title}" passed at ${deadline.toLocaleString()}. Review your auction payment page for next steps.`,
    },
  ];
  const sent = { reminders24h: 0, deadlineReminders: 0 };

  for (const reminder of reminders) {
    const results = await prisma.auctionResult.findMany({
      where: {
        isSettled: false,
        reserveMet: true,
        ...reminder.where,
      },
      select: {
        id: true,
        auctionId: true,
        winningBidderId: true,
        depositDue: true,
        settlementDeadline: true,
        auction: { select: { listing: { select: { title: true } } } },
      },
      take: 100,
    });

    for (const result of results) {
      const claim = await prisma.auctionResult.updateMany({
        where: {
          id: result.id,
          isSettled: false,
          reserveMet: true,
          [reminder.field]: null,
        },
        data: { [reminder.field]: now },
      });
      if (claim.count !== 1) continue;

      try {
        await notify(result.winningBidderId, {
          type:
            reminder.field === "reminder24hSentAt"
              ? "AUCTION_DEPOSIT_REMINDER"
              : "AUCTION_DEPOSIT_DEADLINE",
          title: reminder.title,
          body: reminder.body(
            result.auction.listing.title,
            Number(result.depositDue).toLocaleString(),
            result.settlementDeadline,
          ),
          link: "/buyer?tab=payments",
        });
        if (reminder.field === "reminder24hSentAt") sent.reminders24h += 1;
        else sent.deadlineReminders += 1;
      } catch (error) {
        console.error(
          `[auction-lifecycle] failed to send ${reminder.field} reminder for result ${result.id}`,
          error,
        );
      }
    }
  }

  return sent;
}

async function closeAuction(auctionId: string, now: Date) {
  const outcome = await prisma.$transaction(async (tx) => {
    const claimed = await tx.auction.updateMany({
      where: { id: auctionId, status: "ACTIVE", endAt: { lte: now } },
      data: { status: "CLOSED" },
    });
    if (claimed.count !== 1) return null;

    const auction = await tx.auction.findUniqueOrThrow({
      where: { id: auctionId },
      include: { listing: { select: { id: true, title: true } } },
    });

    const top = await tx.bid.findFirst({
      where: { auctionId },
      orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
    });
    if (!top)
      return {
        auction,
        winnerId: null as string | null,
        amount: "0",
        reserveMet: false,
      };

    const reserveMet =
      auction.reservePrice === null || top.amount.gte(auction.reservePrice);
    const setting = await tx.systemSetting.findUnique({
      where: { key: "auction.depositPercent" },
    });
    const pctRaw = Number(setting?.value ?? 10);
    const pct = Number.isFinite(pctRaw) && pctRaw > 0 ? pctRaw : 10;

    await tx.auctionResult.create({
      data: {
        auctionId,
        winningBidderId: top.bidderId,
        winningAmount: top.amount,
        reserveMet,
        depositDue: top.amount.mul(pct).div(100),
        settlementDeadline: new Date(now.getTime() + SETTLEMENT_WINDOW_MS),
      },
    });
    await tx.auction.update({
      where: { id: auctionId },
      data: { highestBidderId: top.bidderId, currentHighestBid: top.amount },
    });
    if (reserveMet) {
      await tx.listing.update({
        where: { id: auction.listingId },
        data: { status: "AUCTIONED" },
      });
    }
    return {
      auction,
      winnerId: top.bidderId as string | null,
      amount: top.amount.toString(),
      reserveMet,
    };
  });

  if (!outcome) return false;
  const { auction, winnerId, amount, reserveMet } = outcome;
  const title = auction.listing.title;

  await logAudit({
    action: "AUCTION_CLOSED",
    module: "AUCTIONS",
    entityType: "Auction",
    entityId: auctionId,
    newValue: { winnerId, amount, reserveMet },
  });

  await notify(auction.sellerId, {
    type: "AUCTION_CLOSED",
    title: "Auction closed",
    body: !winnerId
      ? `Bidding on "${title}" has ended with no bids.`
      : reserveMet
        ? `Bidding on "${title}" has ended. Winning bid: ${amount}.`
        : `Bidding on "${title}" has ended. The highest bid (${amount}) did not meet your reserve price.`,
    link: "/seller",
  });

  if (winnerId && reserveMet) {
    await notifyAuctionParticipant(winnerId, {
      type: "AUCTION_WON",
      title: "You won the auction!",
      body: `Your bid of ${amount} on "${title}" won. Complete the deposit within 72 hours.`,
      link: "/buyer?tab=payments",
    });
  }
  return true;
}

export async function purgeOrphanMedia(olderThanMs = 24 * 60 * 60 * 1000) {
  const attachedIds = (
    await prisma.listing.findMany({
      where: { idDocumentMediaId: { not: null } },
      select: { idDocumentMediaId: true },
    })
  )
    .map((l) => l.idDocumentMediaId)
    .filter((id): id is string => id !== null);

  const stale = await prisma.mediaFile.findMany({
    where: {
      createdAt: { lt: new Date(Date.now() - olderThanMs) },
      NOT: { id: { in: attachedIds } },
    },
    take: 200,
  });
  for (const m of stale) await deleteFile(m.storageKey);
  if (stale.length) {
    await prisma.mediaFile.deleteMany({
      where: { id: { in: stale.map((m) => m.id) } },
    });
  }
  return stale.length;
}
