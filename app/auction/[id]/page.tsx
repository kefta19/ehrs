import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuctionDetailClient } from "@/components/auction-detail-client";

export const dynamic = "force-dynamic";

export default async function AuctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const auction = await prisma.auction.findUnique({
    where: { id },
    include: {
      listing: {
        include: {
          images: { orderBy: { displayOrder: "asc" } },
          documents: true,
          category: true,
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      highestBidder: true,
      bids: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
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
    const registration = await prisma.buyerBidRegistration.findUnique({
      where: {
        auctionId_buyerId: {
          auctionId: id,
          buyerId: user.id,
        },
      },
    });

    hasPaidEntranceFee = registration?.status === "PAID" || registration?.status === "WAIVED";
    entranceFee = registration;
  }

  return (
    <AuctionDetailClient
      auction={JSON.parse(JSON.stringify(auction))}
      user={user ? JSON.parse(JSON.stringify(user)) : null}
      hasPaidEntranceFee={hasPaidEntranceFee}
      entranceFee={entranceFee ? JSON.parse(JSON.stringify(entranceFee)) : null}
    />
  );
}
