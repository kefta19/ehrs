import "server-only";

import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { bidEligibility } from "@/lib/auction-eligibility";
import { crossTenant } from "@/lib/tenant";
import { rateLimit, logAudit } from "@/lib/security";
import { notify } from "@/lib/notify";
import { notifyAuctionParticipant } from "@/lib/auction-notifications";

class BidError extends Error {}

const MONEY = /^\d{1,10}(\.\d{1,2})?$/;
const SOFT_CLOSE_MS = 5 * 60 * 1000;
const etb = (d: Prisma.Decimal) =>
  `${Number(d.toFixed(2)).toLocaleString()} ETB`;

type BidUser = Parameters<typeof can>[0] & {
  id: string;
  name: string;
  tenantId: string | null;
};

export type PlaceBidResult =
  | { success: true; message: string; auctionId: string }
  | { success: false; error: string };

/**
 * Concurrency-safe bid. The auction row is locked (SELECT ... FOR UPDATE) so
 * concurrent bids are serialised, and eligibility is re-checked against server
 * time taken AFTER the lock is acquired.
 */
export async function placeBid(input: {
  user: BidUser;
  auctionId: string;
  amount: string;
}): Promise<PlaceBidResult> {
  const { user, auctionId } = input;
  if (!can(user, "auction:bid"))
    return { success: false, error: "Your account cannot place bids." };
  if (!user.tenantId)
    return { success: false, error: "Your account is not linked to a marketplace organization." };
  if (!MONEY.test(input.amount.trim()) || Number(input.amount) <= 0)
    return { success: false, error: "Please enter a valid bid amount." };
  if (!rateLimit(`bid:${user.id}`, 10, 60_000))
    return { success: false, error: "Too many bids. Please wait a moment." };
  const amount = new Prisma.Decimal(input.amount.trim());

  try {
    const r = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Auction" WHERE "id" = ${auctionId} FOR UPDATE`;
        const a = await tx.auction.findUnique({
          where: { id: auctionId },
          include: {
            listing: {
              select: { title: true, status: true, tenantId: true, entryFeeStatus: true },
            },
          },
        });
        if (
          !a ||
          crossTenant(user.tenantId, a.listing.tenantId)
        )
          throw new BidError("Auction not found.");
        if (a.sellerId === user.id)
          throw new BidError("You cannot bid on your own auction.");

        const now = new Date();
        const e = bidEligibility(
          {
            auctionStatus: a.status,
            listingStatus: a.listing.status,
            entryFeeStatus: a.listing.entryFeeStatus,
            startAt: a.startAt,
            endAt: a.endAt,
          },
          now,
        );
        if (!e.ok) throw new BidError(e.message);

        const minimum = a.currentHighestBid.gt(0)
          ? a.currentHighestBid.add(a.minBidIncrement)
          : a.startingPrice;
        if (amount.lt(minimum))
          throw new BidError(
            `Your bid must be at least ${etb(minimum)} (minimum increment ${etb(a.minBidIncrement)}).`,
          );

        await tx.bid.create({ data: { auctionId, bidderId: user.id, amount } });
        const extend = a.endAt.getTime() - now.getTime() < SOFT_CLOSE_MS;
        const newEndAt = extend
          ? new Date(now.getTime() + SOFT_CLOSE_MS)
          : a.endAt;
        await tx.auction.update({
          where: { id: auctionId },
          data: {
            currentHighestBid: amount,
            highestBidderId: user.id,
            endAt: newEndAt,
            status: "ACTIVE",
          },
        });
        return {
          previousBidder: a.highestBidderId,
          sellerId: a.sellerId,
          title: a.listing.title,
          newEndAt,
        };
      },
      { maxWait: 5_000, timeout: 10_000 },
    );

    const participants = await prisma.bid.findMany({
      where: { auctionId },
      select: { bidderId: true },
      distinct: ["bidderId"],
    });
    await Promise.all(
      participants.map(({ bidderId }) =>
        notifyAuctionParticipant(bidderId, {
          type: "AUCTION_BID_UPDATE",
          title:
            bidderId === r.previousBidder && bidderId !== user.id
              ? "You were outbid"
              : bidderId === user.id
                ? "Your bid was recorded"
                : "New bid placed",
          body:
            bidderId === r.previousBidder && bidderId !== user.id
              ? `A new bid of ${etb(amount)} was placed on "${r.title}". You are no longer the highest bidder.`
              : bidderId === user.id
                ? `Your bid of ${etb(amount)} on "${r.title}" was recorded.`
                : `A new bid of ${etb(amount)} was placed on "${r.title}".`,
          link: `/auction/${auctionId}`,
        }),
      ),
    );
    await notify(r.sellerId, {
      type: "NEW_BID",
      title: "New bid received",
      body: `${user.name} placed a new highest bid of ${etb(amount)} on "${r.title}".`,
      link: "/seller?tab=auctions",
    });
    await logAudit({
      actorId: user.id,
      action: "BID_PLACED",
      module: "BIDS",
      entityType: "Auction",
      entityId: auctionId,
      newValue: {
        amount: amount.toFixed(2),
        newEndAt: r.newEndAt.toISOString(),
      },
    });
    return {
      success: true,
      auctionId,
      message: `Bid of ${etb(amount)} placed. You are the highest bidder.`,
    };
  } catch (e) {
    if (e instanceof BidError) return { success: false, error: e.message };
    console.error("[placeBid]", e);
    return {
      success: false,
      error: "Could not place the bid. Please try again.",
    };
  }
}
