"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function checkEntranceFeeStatusAction(auctionId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Please sign in to continue." };
  }

  const buyerEntryFee = await prisma.buyerAuctionEntryFee.findUnique({
    where: {
      auctionId_buyerId: {
        auctionId,
        buyerId: user.id,
      },
    },
  });

  const buyerReg = await prisma.buyerBidRegistration.findUnique({
    where: {
      auctionId_buyerId: {
        auctionId,
        buyerId: user.id,
      },
    },
  });

  const isFeePaid =
    (buyerEntryFee && buyerEntryFee.status === "CONFIRMED") ||
    (buyerReg && (buyerReg.status === "PAID" || buyerReg.status === "WAIVED"));

  return {
    success: true,
    isFeePaid,
    redirectUrl: isFeePaid ? null : `/payment/entry-fee?auctionId=${auctionId}`,
  };
}
