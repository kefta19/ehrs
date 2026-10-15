import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
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
  return { activated: activated.count, closed };
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
    await notify(winnerId, {
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
