import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bidEligibility } from "@/lib/auction-eligibility";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUserFromRequest(request);
  if (!user)
    return NextResponse.json({ error: "Sign in to view live bids." }, { status: 401 });

  const { id: auctionId } = await params;
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: {
      id: true,
      type: true,
      status: true,
      sellerId: true,
      startAt: true,
      endAt: true,
      currentHighestBid: true,
      listing: {
        select: {
          status: true,
          entryFeeStatus: true,
          tenantId: true,
        },
      },
    },
  });
  if (!auction || auction.type !== "REVERSE")
    return NextResponse.json({ error: "Auction not found." }, { status: 404 });

  let authorized = user.role === "ADMIN" || auction.sellerId === user.id;
  if (user.role === "BUYER" && auction.sellerId !== user.id) {
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
    const eligibility = bidEligibility(
      {
        auctionStatus: auction.status,
        listingStatus: auction.listing.status,
        entryFeeStatus: auction.listing.entryFeeStatus,
        startAt: auction.startAt,
        endAt: auction.endAt,
      },
      new Date(),
    );
    authorized =
      eligibility.ok &&
      (!user.tenantId ||
        !auction.listing.tenantId ||
        user.tenantId === auction.listing.tenantId) &&
      (entryFee?.status === "CONFIRMED" ||
        registration?.status === "PAID" ||
        registration?.status === "WAIVED");
  }
  if (!authorized)
    return NextResponse.json({ error: "You are not an authorized auction participant." }, { status: 403 });

  const bids = await prisma.bid.findMany({
    where: { auctionId, status: "APPROVED" },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      amount: true,
      createdAt: true,
      bidder: {
        select: {
          name: true,
          tenant: {
            select: {
              name: true,
              branding: { select: { companyName: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(
    {
      bids: bids.map((bid) => ({
        id: bid.id,
        amount: bid.amount.toString(),
        createdAt: bid.createdAt.toISOString(),
        companyName:
          bid.bidder.tenant?.branding?.companyName ??
          bid.bidder.tenant?.name ??
          bid.bidder.name,
      })),
      currentBid: auction.currentHighestBid.toString(),
      endAt: auction.endAt.toISOString(),
      serverTime: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
