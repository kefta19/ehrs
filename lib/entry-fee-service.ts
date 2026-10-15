import "server-only";

import { randomBytes } from "node:crypto";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateEntryFee, sameAmount } from "@/lib/entry-fee";
import { can } from "@/lib/rbac";
import { notify, notifyAdmins } from "@/lib/notify";
import { verifyChapa } from "@/lib/payments/chapa";
import { canVerifyEntryFee } from "@/lib/entry-fee-policy";

type Tx = Prisma.TransactionClient;

export class EntryFeeError extends Error {}

export const newTxRef = (auctionId: string) =>
  `EHRS-${auctionId.slice(-6)}-${randomBytes(8).toString("hex")}`;

export async function getEntryFeePercent(db: Tx | typeof prisma = prisma) {
  const s = await db.systemSetting.findUnique({
    where: { key: "auction.entryFeePercent" },
  });
  const v = s?.value == null ? "" : String(s.value);
  return /^\d+(\.\d{1,2})?$/.test(v) ? v : "2.5";
}

/**
 * One fee record per (auction, starting price). The rate is snapshotted when the
 * record is created and never recalculated from settings afterwards.
 *  - same price, UNPAID/PENDING/CONFIRMED -> reuse as is
 *  - same price, FAILED                   -> new record, SAME rate
 *  - price changed                        -> old record SUPERSEDED, new one at the current rate
 */
export async function ensureEntryFeeSnapshot(
  tx: Tx,
  auction: { id: string; tenantId: string; listingId: string; startingPrice: Prisma.Decimal },
  payerId: string,
) {
  const basis = auction.startingPrice.toFixed(2);
  const existing = await tx.auctionEntryFee.findFirst({
    where: { auctionId: auction.id, status: { not: "SUPERSEDED" } },
    orderBy: { createdAt: "desc" },
  });
  const sameBasis =
    !!existing && sameAmount(existing.basisAmount.toFixed(2), basis);

  if (existing && sameBasis && existing.status !== "FAILED") return existing;

  let rate: string;
  if (existing && sameBasis) {
    rate = existing.ratePercent.toFixed(2);
  } else {
    const current = await getEntryFeePercent(tx);
    if (!current)
      throw new EntryFeeError(
        "The entry-fee percentage has not been configured by an administrator yet.",
      );
    rate = current;
  }
  if (existing)
    await tx.auctionEntryFee.update({
      where: { id: existing.id },
      data: { status: "SUPERSEDED" },
    });

  const snap = calculateEntryFee(basis, rate);
  const fee = await tx.auctionEntryFee.create({
    data: {
      tenantId: auction.tenantId,
      listingId: auction.listingId,
      auctionId: auction.id,
      payerId,
      basisAmount: snap.basisAmount,
      ratePercent: snap.ratePercent,
      amount: snap.amount,
      currency: "ETB",
      status: "UNPAID",
      txRef: newTxRef(auction.id),
    },
  });
  await tx.listing.update({
    where: { id: auction.listingId },
    data: { entryFeeStatus: "UNPAID" },
  });
  return fee;
}

/** DRAFT -> PENDING_APPROVAL and listing -> PENDING_REVIEW. Idempotent. */
export async function submitForReviewTx(
  tx: Tx,
  auctionId: string,
): Promise<boolean> {
  const a = await tx.auction.findUnique({
    where: { id: auctionId },
    select: { listingId: true },
  });
  if (!a) return false;
  const moved = await tx.auction.updateMany({
    where: { id: auctionId, status: "DRAFT" },
    data: { status: "PENDING_APPROVAL", approvedById: null },
  });
  if (moved.count !== 1) return false;
  await tx.listing.updateMany({
    where: { id: a.listingId, status: { in: ["DRAFT", "REJECTED"] } },
    data: {
      status: "PENDING_REVIEW",
      rejectionReason: null,
      submittedAt: new Date(),
    },
  });
  return true;
}

export type ConfirmResult =
  | { status: "CONFIRMED"; feeId: string; submitted: boolean }
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
 * The ONLY place a fee becomes CONFIRMED. Safe to call any number of times:
 *  - webhook event dedupe (unique provider + eventKey)
 *  - status-guarded updateMany (only UNPAID/PENDING can move)
 * Confirming a fee now automatically approves the auction for public view if the listing is already approved.
 */
export async function confirmEntryFee(o: {
  txRef: string;
  provider: "CHAPA" | "BANK_TRANSFER";
  eventKey: string;
  providerRef?: string | null;
  paidAmount?: string;
  paidCurrency?: string;
  actorId?: string | null;
}): Promise<ConfirmResult> {
  const { result, payerId, auctionId, listingApproved } = await prisma.$transaction(
    async (tx): Promise<{ result: ConfirmResult; payerId?: string; auctionId?: string; listingApproved?: boolean }> => {
      const fee = await tx.auctionEntryFee.findUnique({
        where: { txRef: o.txRef },
        include: { auction: { select: { id: true, startAt: true, listingId: true } } },
      });
      if (!fee) return { result: { status: "NOT_FOUND" } };
      if (fee.status === "CONFIRMED") return { result: { status: "ALREADY" } };
      if (fee.status !== "UNPAID" && fee.status !== "PENDING")
        return { result: { status: "INVALID_STATE" } };

      if (o.paidAmount !== undefined) {
        const okAmount = sameAmount(o.paidAmount, fee.amount.toFixed(2));
        if (!okAmount || (o.paidCurrency ?? "") !== fee.currency)
          return { result: { status: "MISMATCH" } };
      }

      const ev = await tx.paymentWebhookEvent.createMany({
        data: [{ provider: o.provider, eventKey: o.eventKey, txRef: o.txRef }],
        skipDuplicates: true,
      });
      if (ev.count === 0) return { result: { status: "DUPLICATE" } };

      const moved = await tx.auctionEntryFee.updateMany({
        where: { id: fee.id, status: { in: ["UNPAID", "PENDING"] } },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          providerRef: o.providerRef ?? undefined,
          verifiedById: o.actorId ?? undefined,
        },
      });
      if (moved.count !== 1) return { result: { status: "ALREADY" } };

      await tx.listing.updateMany({
        where: { id: fee.listingId },
        data: { entryFeeStatus: "CONFIRMED" },
      });

      // Check if listing is already approved - if so, auto-approve the auction for public view
      const listing = await tx.listing.findUnique({
        where: { id: fee.auction.listingId },
        select: { status: true },
      });
      const listingApproved = listing?.status === "APPROVED";

      if (listingApproved) {
        // Move auction to SCHEDULED (or ACTIVE if start time has passed)
        const now = new Date();
        const nextStatus = fee.auction.startAt > now ? "SCHEDULED" : "ACTIVE";
        await tx.auction.update({
          where: { id: fee.auctionId },
          data: { 
            status: nextStatus,
            approvedById: o.actorId ?? undefined,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: o.actorId ?? null,
          action: "ENTRY_FEE_CONFIRMED",
          module: "PAYMENTS",
          entityType: "AuctionEntryFee",
          entityId: fee.id,
          newValue: {
            provider: o.provider,
            amount: fee.amount.toFixed(2),
            providerRef: o.providerRef ?? null,
            listingApproved,
          },
        },
      });
      return {
        result: { status: "CONFIRMED", feeId: fee.id, submitted: listingApproved },
        payerId: fee.payerId,
        auctionId: fee.auction.id,
        listingApproved,
      };
    },
  );

  if (result.status === "CONFIRMED") {
    if (payerId) {
      await notify(payerId, {
        type: "ENTRY_FEE_CONFIRMED",
        title: listingApproved 
          ? "Entry fee confirmed - Auction now live!" 
          : "Entry fee confirmed",
        body: listingApproved
          ? "Your entry fee was confirmed and your auction is now scheduled for public view."
          : "Your entry fee was confirmed. Wait for your listing to be approved by an administrator.",
        link: "/seller",
      });
    }
    if (listingApproved) {
      await notifyAdmins({
        type: "AUCTION_AUTO_APPROVED",
        title: "Auction auto-approved after payment",
        body: `Auction ${auctionId} was automatically approved for public view after entry fee confirmation.`,
        link: "/admin?tab=auctions",
      });
    }
  }
  return result;
}

/** Ask Chapa (server-to-server) and confirm only if it says paid for the right amount. */
export async function verifyAndConfirmChapa(
  txRef: string,
): Promise<ConfirmResult> {
  const fee = await prisma.auctionEntryFee.findUnique({
    where: { txRef },
    select: { id: true },
  });
  if (!fee) return { status: "NOT_FOUND" };
  const v = await verifyChapa(txRef);
  if (!v.paid) return { status: "PENDING" };
  return confirmEntryFee({
    txRef,
    provider: "CHAPA",
    eventKey: `paid:${txRef}`,
    providerRef: v.reference,
    paidAmount: v.amount,
    paidCurrency: v.currency,
  });
}

type Actor = Parameters<typeof can>[0] & {
  id: string;
  tenantId: string | null;
};

/** A verifier must be authorised, in the same tenant, and not the payer or the owner. */
export function assertCanVerify(
  verifier: Actor,
  fee: { payerId: string; tenantId: string },
  auction: { sellerId: string },
) {
  if (
    !canVerifyEntryFee({
      verifierId: verifier.id,
      verifierTenantId: verifier.tenantId,
      canVerify: can(verifier, "payment:verify"),
      feeTenantId: fee.tenantId,
      payerId: fee.payerId,
      sellerId: auction.sellerId,
    })
  )
    throw new EntryFeeError("You are not allowed to verify payments.");
}
