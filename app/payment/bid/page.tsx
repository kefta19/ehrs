import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BidPaymentClient } from "@/components/bid-payment-client";

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

  const { auctionId, bidAmount } = await searchParams;

  if (!auctionId || !bidAmount) {
    redirect("/buyer");
  }

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

  const amount = parseFloat(bidAmount);

  return (
    <BidPaymentClient
      user={JSON.parse(JSON.stringify(user))}
      auction={JSON.parse(JSON.stringify(auction))}
      bidAmount={amount}
    />
  );
}
