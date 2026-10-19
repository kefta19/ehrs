import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EntryFeePaymentClient } from "@/components/entry-fee-payment-client";

export const dynamic = "force-dynamic";

export default async function EntryFeePaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ auctionId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirect=/payment/entry-fee");
  }

  const { auctionId } = await searchParams;

  if (!auctionId) {
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

  // Check if user already paid
  const existingPayment = await prisma.buyerAuctionEntryFee.findUnique({
    where: {
      auctionId_buyerId: {
        auctionId,
        buyerId: user.id,
      },
    },
  });
  const existingRegistration = await prisma.buyerBidRegistration.findUnique({
    where: {
      auctionId_buyerId: {
        auctionId,
        buyerId: user.id,
      },
    },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      paymentProofUrl: true,
      txRef: true,
      note: true,
    },
  });

  if (
    (existingPayment && existingPayment.status === "CONFIRMED") ||
    existingRegistration?.status === "PAID" ||
    existingRegistration?.status === "WAIVED"
  ) {
    redirect(`/auction/${auctionId}`);
  }

  const entryFeeAmount = Math.max(
    100,
    Math.round(Number(auction.startingPrice) * 0.01),
  );

  return (
    <EntryFeePaymentClient
      auction={JSON.parse(JSON.stringify(auction))}
      entryFeeAmount={entryFeeAmount}
      existingRegistration={existingRegistration ? JSON.parse(JSON.stringify(existingRegistration)) : null}
    />
  );
}
