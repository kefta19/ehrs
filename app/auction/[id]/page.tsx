import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuctionDetailClient } from "@/components/auction-detail-client";

export const dynamic = "force-dynamic";

function anonymizeAuctionBids(
  bids: {
    id: string;
    amount: unknown;
    createdAt: Date;
    bidder: { id: string };
  }[],
  currentUserId?: string,
) {
  const bidderLabels = new Map<string, string>();
  let nextBidderNumber = 1;
  return bids.map((bid) => {
    if (bid.bidder.id !== currentUserId && !bidderLabels.has(bid.bidder.id)) {
      bidderLabels.set(bid.bidder.id, `Bidder ${nextBidderNumber}`);
      nextBidderNumber += 1;
    }
    return {
      id: bid.id,
      amount: bid.amount,
      createdAt: bid.createdAt,
      bidder: {
        name:
          bid.bidder.id === currentUserId
            ? "You"
            : bidderLabels.get(bid.bidder.id) ?? "Bidder",
      },
    };
  });
}

export default async function AuctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const auction = await prisma.auction.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      startAt: true,
      endAt: true,
      startingPrice: true,
      currentHighestBid: true,
      minBidIncrement: true,
      terms: true,
      listing: {
        select: {
          id: true,
          title: true,
          status: true,
          description: true,
          condition: true,
          address: true,
          city: true,
          region: true,
          country: true,
          referenceNumber: true,
          features: true,
          attributes: true,
          videoUrl: true,
          images: { orderBy: { displayOrder: "asc" } },
          category: { select: { name: true } },
          seller: {
            select: {
              id: true,
              name: true,
              sellerProfile: {
                select: {
                  businessName: true,
                  status: true,
                },
              },
            },
          },
        },
      },
      bids: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          amount: true,
          createdAt: true,
          bidder: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!auction) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground transition-colors">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Auction Not Found</h1>
          <p className="text-slate-600 dark:text-slate-400">This auction does not exist.</p>
        </div>
      </div>
    );
  }

  // Only show approved auctions to public
  if (auction.listing.status !== "APPROVED") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground transition-colors">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Auction Not Available</h1>
          <p className="text-slate-600 dark:text-slate-400">This auction is not yet approved for public viewing.</p>
        </div>
      </div>
    );
  }

  // Check if user has paid entrance fee
  let hasPaidEntranceFee = false;
  let entranceFee = null;

  if (user) {
    const [registration, existingEntryFee] = await Promise.all([
      prisma.buyerBidRegistration.findUnique({
        where: {
          auctionId_buyerId: {
            auctionId: id,
            buyerId: user.id,
          },
        },
      }),
      prisma.buyerAuctionEntryFee.findUnique({
        where: {
          auctionId_buyerId: {
            auctionId: id,
            buyerId: user.id,
          },
        },
        select: { status: true },
      }),
    ]);

    hasPaidEntranceFee =
      registration?.status === "PAID" ||
      registration?.status === "WAIVED" ||
      existingEntryFee?.status === "CONFIRMED";
    entranceFee = registration;
  }

  const sellerContact =
    user?.role === "BUYER" && hasPaidEntranceFee
      ? await prisma.user.findUnique({
          where: { id: auction.listing.seller.id },
          select: { email: true, phone: true },
        })
      : null;
  const auctionForClient = {
    ...auction,
    bids: anonymizeAuctionBids(auction.bids, user?.id),
    listing: {
      ...auction.listing,
      seller: {
        ...auction.listing.seller,
        email: sellerContact?.email ?? null,
        phone: sellerContact?.phone ?? null,
      },
    },
  };

  return (
    <AuctionDetailClient
      auction={JSON.parse(JSON.stringify(auctionForClient))}
      user={user ? { id: user.id, role: user.role, email: user.email } : null}
      hasPaidEntranceFee={hasPaidEntranceFee}
      entranceFee={entranceFee ? JSON.parse(JSON.stringify(entranceFee)) : null}
    />
  );
}
