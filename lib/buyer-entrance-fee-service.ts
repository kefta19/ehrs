import "server-only";

import { randomBytes } from "node:crypto";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { notify, notifyAdmins } from "@/lib/notify";
import { verifyChapa } from "@/lib/payments/chapa";
import { logAudit } from "@/lib/security";

type Tx = Prisma.TransactionClient;

export class BuyerEntranceFeeError extends Error {}

export const newBuyerTxRef = (auctionId: string, buyerId: string) =>
  `BUYER-${auctionId.slice(-6)}-${buyerId.slice(-6)}-${randomBytes(6).toString("hex")}`;

/**
 * Calculate buyer entrance fee (typically a fixed small amount, e.g., 100-500 ETB)
 * This is separate from the seller's entry fee
 */
const BUYER_ENTRANCE_FEE_ETB = 250; // 250 ETB entrance fee for buyers

/**
 * Create or retrieve buyer entrance fee record for an auction
 */
export async function ensureBuyerEntranceFee(
  tx: Tx,
  auctionId: string,
  buyerId: string,
) {
  const existing = await tx.buyerAuctionEntryFee.findUnique({
    where: {
      auctionId_buyerId: {
        auctionId,
        buyerId,
      },
    },
  });

  // If already confirmed, return existing
  if (existing && existing.status === "CONFIRMED") {
    return existing;
  }

  // If failed or unpaid, create new record
  const txRef = newBuyerTxRef(auctionId, buyerId);
  const fee = await tx.buyerAuctionEntryFee.create({
    data: {
      auctionId,
      buyerId,
      amount: BUYER_ENTRANCE_FEE_ETB,
      currency: "ETB",
      status: "UNPAID",
      txRef,
      method: null,
    },
  });

  return fee;
}

export type BuyerConfirmResult =
  | { status: "CONFIRMED"; feeId: string }
  | {
      status:
        | "ALREADY"
        | "DUPLICATE"
        | "NOT_FOUND"
        | "MISMATCH"
        | "INVALID_STATE"
        | "PENDING";
    };

/**
 * Confirm buyer entrance fee payment
 */
export async function confirmBuyerEntranceFee(o: {
  txRef: string;
  provider: "CHAPA" | "BANK_TRANSFER";
  eventKey: string;
  providerRef?: string | null;
  paidAmount?: string;
  paidCurrency?: string;
  actorId?: string | null;
}): Promise<BuyerConfirmResult> {
  const { result, buyerId, auctionId } = await prisma.$transaction(
    async (tx): Promise<{ result: BuyerConfirmResult; buyerId?: string; auctionId?: string }> => {
      const fee = await tx.buyerAuctionEntryFee.findUnique({
        where: { txRef: o.txRef },
        include: { auction: { select: { id: true, listingId: true } } },
      });
      if (!fee) return { result: { status: "NOT_FOUND" } };
      if (fee.status === "CONFIRMED") return { result: { status: "ALREADY" } };
      if (fee.status !== "UNPAID" && fee.status !== "PENDING")
        return { result: { status: "INVALID_STATE" } };

      if (o.paidAmount !== undefined) {
        const expectedAmount = fee.amount.toFixed(2);
        if (o.paidAmount !== expectedAmount || (o.paidCurrency ?? "") !== fee.currency)
          return { result: { status: "MISMATCH" } };
      }

      // Deduplicate webhook events
      const ev = await tx.paymentWebhookEvent.createMany({
        data: [{ provider: o.provider, eventKey: o.eventKey, txRef: o.txRef }],
        skipDuplicates: true,
      });
      if (ev.count === 0) return { result: { status: "DUPLICATE" } };

      const moved = await tx.buyerAuctionEntryFee.updateMany({
        where: { id: fee.id, status: { in: ["UNPAID", "PENDING"] } },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          providerRef: o.providerRef ?? undefined,
          verifiedById: o.actorId ?? undefined,
        },
      });
      if (moved.count !== 1) return { result: { status: "ALREADY" } };

      // Create buyer bid registration record
      await tx.buyerBidRegistration.upsert({
        where: {
          auctionId_buyerId: {
            auctionId: fee.auctionId,
            buyerId: fee.buyerId,
          },
        },
        create: {
          auctionId: fee.auctionId,
          buyerId: fee.buyerId,
          status: "PAID",
          feeAmount: fee.amount,
        },
        update: {
          status: "PAID",
          feeAmount: fee.amount,
        },
      });

      await logAudit({
        actorId: o.actorId ?? null,
        action: "BUYER_ENTRANCE_FEE_CONFIRMED",
        module: "PAYMENTS",
        entityType: "BuyerAuctionEntryFee",
        entityId: fee.id,
        newValue: {
          provider: o.provider,
          amount: fee.amount.toFixed(2),
          providerRef: o.providerRef ?? null,
        },
      });

      return {
        result: { status: "CONFIRMED", feeId: fee.id },
        buyerId: fee.buyerId,
        auctionId: fee.auction.id,
      };
    },
  );

  if (result.status === "CONFIRMED") {
    if (buyerId) {
      await notify(buyerId, {
        type: "BUYER_ENTRANCE_FEE_CONFIRMED",
        title: "Entrance fee confirmed - Ready to bid!",
        body: "Your entrance fee has been confirmed. You can now place bids on this auction.",
        link: `/auction/${auctionId}`,
      });
    }
    await notifyAdmins({
      type: "BUYER_ENTRANCE_FEE_PAID",
      title: "Buyer entrance fee paid",
      body: `Buyer entrance fee of ${BUYER_ENTRANCE_FEE_ETB} ETB confirmed for auction ${auctionId}.`,
      link: `/admin?tab=auctions`,
    });
  }

  return result;
}

/**
 * Verify Chapa payment for buyer entrance fee
 */
export async function verifyAndConfirmBuyerChapa(
  txRef: string,
): Promise<BuyerConfirmResult> {
  const fee = await prisma.buyerAuctionEntryFee.findUnique({
    where: { txRef },
    select: { id: true },
  });
  if (!fee) return { status: "NOT_FOUND" };

  const v = await verifyChapa(txRef);
  if (!v.paid) return { status: "PENDING" };

  return confirmBuyerEntranceFee({
    txRef,
    provider: "CHAPA",
    eventKey: `buyer-paid:${txRef}`,
    providerRef: v.reference,
    paidAmount: v.amount,
    paidCurrency: v.currency,
  });
}
