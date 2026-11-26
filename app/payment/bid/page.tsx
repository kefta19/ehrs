import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BidPaymentClient } from "@/components/bid-payment-client";
import { roleHome } from "@/lib/rbac";
import { syncAuctionStatuses } from "@/lib/auction-lifecycle";

export const dynamic = "force-dynamic";

export default async function BidPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ auctionId?: string; bidAmount?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirect=/payment/bid");
  }
  if (user.role !== "BUYER") redirect(roleHome(user.role));

  const { auctionId, bidAmount } = await searchParams;

  if (!auctionId || !bidAmount) {
    redirect("/buyer");
  }

  await syncAuctionStatuses().catch((error) =>
    console.error("Auction sync error:", error),
  );

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      listing: {
        include: {
          category: true,
          images: true,
        },
      },
    },
  });

  if (!auction) {
    redirect("/buyer");
  }

  if (auction.sellerId === user.id) redirect(`/auction/${auction.id}`);
  if (auction.status !== "ACTIVE" || auction.endAt <= new Date()) {
    redirect("/customer?tab=browse");
  }

  const amount = Number(bidAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    redirect(`/auction/${auction.id}`);
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
  const hasPaidEntranceFee =
    entryFee?.status === "CONFIRMED" ||
    registration?.status === "PAID" ||
    registration?.status === "WAIVED";
  if (!hasPaidEntranceFee) {
    redirect(`/payment/entry-fee?auctionId=${encodeURIComponent(auctionId)}`);
  }

  const currentBid = Number(auction.currentHighestBid);
  const bidBoundary =
    currentBid > 0
      ? currentBid +
        (auction.type === "REVERSE"
          ? -Number(auction.minBidIncrement)
          : Number(auction.minBidIncrement))
      : Number(auction.startingPrice);
  if (auction.type === "REVERSE" && bidBoundary <= 0)
    redirect(`/auction/${auction.id}`);
  const updatedBidAmount =
    auction.type === "REVERSE"
      ? Math.min(amount, bidBoundary)
      : Math.max(amount, bidBoundary);

  return (
    <BidPaymentClient
      auction={JSON.parse(JSON.stringify(auction))}
      bidAmount={updatedBidAmount}
      auctionType={auction.type}
      bidBoundary={bidBoundary}
      endAt={auction.endAt.toISOString()}
      bidAmountUpdated={updatedBidAmount !== amount}
    />
  );
}
