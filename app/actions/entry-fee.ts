"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/security";
import { crossTenant } from "@/lib/tenant";
import { notify, notifyAdmins } from "@/lib/notify";
import { buildChecklist, failedItems } from "@/lib/listing-readiness";
import { submitAuctionSchema } from "@/lib/listing-validation";
import {
  EntryFeeError,
  assertCanVerify,
  confirmEntryFee,
  ensureEntryFeeSnapshot,
  newTxRef,
  submitForReviewTx,
  verifyAndConfirmChapa,
} from "@/lib/entry-fee-service";
import { chapaConfigured, initializeChapa } from "@/lib/payments/chapa";

type Fail = { success: false; error: string };
const fail = (error: string): Fail => ({ success: false, error });
const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};
const ensureUserTenant = async (user: { id: string; tenantId: string | null }) => {
  if (user.tenantId) return user.tenantId;

  const defaultTenant = await prisma.tenant.findFirst({
    where: { isDefault: true, isActive: true },
    select: { id: true },
  });

  if (!defaultTenant) return null;

  await prisma.user.update({
    where: { id: user.id },
    data: { tenantId: defaultTenant.id },
  });

  return defaultTenant.id;
};
const refresh = () => {
  for (const p of ["/seller", "/provider", "/admin", "/buyer", "/"])
    revalidatePath(p);
};

export type FeeView = {
  id: string;
  status: string;
  method: string | null;
  amount: string;
  ratePercent: string;
  basisAmount: string;
  currency: string;
};
const feeView = (f: {
  id: string;
  status: string;
  method: string | null;
  amount: Prisma.Decimal;
  ratePercent: Prisma.Decimal;
  basisAmount: Prisma.Decimal;
  currency: string;
}): FeeView => ({
  id: f.id,
  status: f.status,
  method: f.method,
  currency: f.currency,
  amount: f.amount.toFixed(2),
  ratePercent: f.ratePercent.toFixed(2),
  basisAmount: f.basisAmount.toFixed(2),
});

/** Owner-only: loads the fee and proves the signed-in user owns it (same tenant). */
async function ownerFee(feeId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user, "auction:create"))
    throw new EntryFeeError("Unauthorized");
  const fee = await prisma.auctionEntryFee.findUnique({
    where: { id: feeId },
    include: {
      auction: { select: { id: true, sellerId: true } },
    },
  });
  if (
    !fee ||
    fee.auction.sellerId !== user.id ||
    !user.tenantId ||
    fee.tenantId !== user.tenantId ||
    crossTenant(user.tenantId, fee.tenantId)
  )
    throw new EntryFeeError("Payment not found.");
  return { user, fee };
}

/* ── Step 2: save the auction configuration as a DRAFT and quote the fee ── */
export async function createAuctionDraftAction(
  formData: FormData,
): Promise<
  Fail | {
    success: true;
    auctionId: string;
    fee: FeeView;
    chapaAvailable: boolean;
  }
> {
  const user = await getCurrentUser();
  if (!user || !can(user, "auction:create")) return fail("Unauthorized");

  const tenantId = await ensureUserTenant(user);
  if (!tenantId) return fail("Your account is not linked to an organization.");

  const parsed = submitAuctionSchema.safeParse({
    listingId: str(formData, "listingId"),
    startingPrice: str(formData, "startingPrice"),
    reservePrice: str(formData, "reservePrice"),
    minBidIncrement: str(formData, "minBidIncrement"),
    startAt: str(formData, "startAt"),
    endAt: str(formData, "endAt"),
    terms: str(formData, "terms") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;

  const listing = await prisma.listing.findUnique({
    where: { id: d.listingId },
    include: { images: true, auctions: true },
  });
  // owner and tenant come from the session, never from the form
  if (
    !listing ||
    listing.sellerId !== user.id ||
    crossTenant(tenantId, listing.tenantId)
  )
    return fail(
      "Listing not found or you do not have permission to auction it.",
    );
  if (!listing.tenantId) {
    const claimed = await prisma.listing.updateMany({
      where: { id: listing.id, sellerId: user.id, tenantId: null },
      data: { tenantId },
    });
    if (
      claimed.count !== 1 &&
      !(await prisma.listing.findFirst({
        where: { id: listing.id, sellerId: user.id, tenantId },
        select: { id: true },
      }))
    )
      return fail("Listing organization changed. Refresh and try again.");
  }
  // Check if listing has ownership or legal documents in the documents table
  const ownershipDocs = await prisma.listingDocument.count({
    where: { listingId: listing.id },
  });
  if (ownershipDocs === 0 && !listing.idDocumentMediaId)
    return fail("Ownership or authorization evidence (title deed) must be uploaded before auction setup.");
  if (listing.status !== "DRAFT" && listing.status !== "REJECTED")
    return fail("This listing has already been submitted for review.");
  if (
    listing.auctions.some(
      (a) => a.status !== "DRAFT" && a.status !== "CANCELLED",
    )
  )
    return fail("This listing already has an auction in progress.");
  const missing = failedItems(buildChecklist(listing));
  if (missing.length)
    return fail(
      `Listing is incomplete: ${missing.map((m) => m.label).join("; ")}.`,
    );

  const data = {
    startingPrice: new Prisma.Decimal(d.startingPrice),
    reservePrice:
      d.reservePrice === undefined
        ? null
        : new Prisma.Decimal(d.reservePrice),
    minBidIncrement: new Prisma.Decimal(d.minBidIncrement),
    startAt: new Date(d.startAt),
    endAt: new Date(d.endAt),
    terms: d.terms || null,
  };
  const draft = listing.auctions.find((a) => a.status === "DRAFT");

  try {
    const { auction, fee } = await prisma.$transaction(async (tx) => {
      const auction = draft
        ? await tx.auction.update({
            where: { id: draft.id, sellerId: user.id },
            data: { ...data },
          })
        : await tx.auction.create({
            data: {
              ...data,
              listingId: listing.id,
              sellerId: user.id,
              currentHighestBid: 0,
              status: "DRAFT",
            },
          });
      const fee = await ensureEntryFeeSnapshot(
        tx,
        {
          id: auction.id,
          tenantId,
          listingId: listing.id,
          startingPrice: auction.startingPrice,
        },
        user.id,
      );
      return { auction, fee };
    });
    await logAudit({
      actorId: user.id,
      action: "AUCTION_DRAFT_SAVED",
      module: "AUCTIONS",
      entityType: "Auction",
      entityId: auction.id,
      newValue: {
        entryFeeId: fee.id,
        entryFee: fee.amount.toFixed(2),
        ratePercent: fee.ratePercent.toFixed(2),
      },
    });
    refresh();
    return {
      success: true,
      auctionId: auction.id,
      fee: feeView(fee),
      chapaAvailable: chapaConfigured(),
    };
  } catch (e) {
    if (e instanceof EntryFeeError) return fail(e.message);
    console.error("[createAuctionDraftAction]", e);
    return fail("Could not save the auction. Please try again.");
  }
}

/* ── Chapa: start checkout. Success is only ever decided by server verification. ── */
export async function payEntryFeeWithChapaAction(
  feeId: string,
): Promise<Fail | { success: true; checkoutUrl: string }> {
  try {
    const { user, fee } = await ownerFee(feeId);
    if (!chapaConfigured())
      return fail(
        "Online payment (Chapa) is not configured yet. Use bank transfer or contact the administrator.",
      );
    if (fee.status === "CONFIRMED")
      return fail("This entry fee is already confirmed.");
    if (
      fee.status !== "UNPAID" &&
      !(fee.status === "PENDING" && fee.method !== "BANK_TRANSFER")
    )
      return fail("This entry fee cannot be paid online right now.");

    const txRef = newTxRef(fee.auctionId); // Chapa rejects reused references
    const moved = await prisma.auctionEntryFee.updateMany({
      where: { id: fee.id, status: { in: ["UNPAID", "PENDING"] } },
      data: { txRef, method: "CHAPA", status: "PENDING" },
    });
    if (moved.count !== 1)
      return fail("This entry fee changed. Please refresh.");
    await prisma.listing.update({
      where: { id: fee.listingId },
      data: { entryFeeStatus: "PENDING" },
    });
    await logAudit({
      actorId: user.id,
      action: "ENTRY_FEE_CHAPA_INITIALIZED",
      module: "PAYMENTS",
      entityType: "AuctionEntryFee",
      entityId: fee.id,
      newValue: { txRef },
    });
    const { checkoutUrl } = await initializeChapa({
      amount: fee.amount.toFixed(2),
      currency: fee.currency,
      email: user.email,
      name: user.name,
      txRef,
    });
    return { success: true, checkoutUrl };
  } catch (e) {
    if (e instanceof EntryFeeError) return fail(e.message);
    console.error("[payEntryFeeWithChapaAction]", e);
    return fail("Could not start the payment. Please try again.");
  }
}

/** "I've paid" button / return page: asks Chapa, never trusts the redirect. */
export async function checkEntryFeeAction(
  feeId: string,
): Promise<Fail | { success: true; status: string; message: string }> {
  try {
    const { fee } = await ownerFee(feeId);
    if (fee.method !== "CHAPA")
      return fail("This fee was not paid through Chapa.");
    const r = await verifyAndConfirmChapa(fee.txRef);
    refresh();
    const message =
      r.status === "CONFIRMED" ||
      r.status === "ALREADY" ||
      r.status === "DUPLICATE"
        ? "Payment confirmed. Submit the listing for administrator review to continue."
        : r.status === "MISMATCH"
          ? "The payment amount did not match. Contact support."
          : "We have not received a confirmed payment yet.";
    return { success: true, status: r.status, message };
  } catch (e) {
    if (e instanceof EntryFeeError) return fail(e.message);
    console.error("[checkEntryFeeAction]", e);
    return fail("Could not verify the payment. Please try again.");
  }
}

/* ── Bank transfer: record the reference; an independent admin confirms it ── */
export async function submitBankTransferAction(
  formData: FormData,
): Promise<Fail | { success: true; message: string }> {
  try {
    const ref = z
      .string()
      .trim()
      .min(4, "Enter the bank reference")
      .max(100)
      .safeParse(str(formData, "reference"));
    if (!ref.success) return fail(ref.error.issues[0].message);
    const { user, fee } = await ownerFee(str(formData, "feeId"));
    if (fee.status === "CONFIRMED")
      return fail("This entry fee is already confirmed.");
    const transactionUrl = z
      .string()
      .trim()
      .url("Enter a valid transaction link.")
      .max(2048, "The transaction link is too long.")
      .refine((value) => {
        try {
          return new URL(value).protocol === "https:";
        } catch {
          return false;
        }
      }, {
        message: "Use a secure HTTPS transaction link.",
      })
      .safeParse(str(formData, "transactionUrl"));
    if (!transactionUrl.success)
      return fail(transactionUrl.error.issues[0].message);

    const submitted = await prisma.$transaction(async (tx) => {
      const moved = await tx.auctionEntryFee.updateMany({
        where: {
          id: fee.id,
          OR: [{ status: "UNPAID" }, { status: "PENDING", method: "CHAPA" }],
        },
        data: {
          method: "BANK_TRANSFER",
          status: "PENDING",
          bankReference: ref.data,
          transactionUrl: transactionUrl.data,
        },
      });
      if (moved.count !== 1)
        throw new EntryFeeError(
          "A bank reference was already submitted for this fee. Refresh and try again.",
        );
      await tx.listing.update({
        where: { id: fee.listingId },
        data: { entryFeeStatus: "PENDING" },
      });
      return submitForReviewTx(tx, fee.auctionId);
    });
    await logAudit({
      actorId: user.id,
      action: "ENTRY_FEE_BANK_REFERENCE_SUBMITTED",
      module: "PAYMENTS",
      entityType: "AuctionEntryFee",
      entityId: fee.id,
      newValue: { reference: ref.data, transactionUrlSubmitted: true },
    });
    await notifyAdmins({
      type: "ENTRY_FEE_SUBMITTED",
      title: submitted
        ? "Listing awaiting approval"
        : "Bank transfer awaiting verification",
      body: `${user.name} submitted bank reference "${ref.data}" for an entry fee. Verification required.`,
      link: "/admin?tab=listings",
    });
    refresh();
    return {
      success: true,
      message:
        "Submitted. An administrator will verify your transfer and review the listing.",
    };
  } catch (e) {
    if (e instanceof EntryFeeError) return fail(e.message);
    if ((e as { code?: string })?.code === "P2002")
      return fail("This bank reference has already been used.");
    console.error("[submitBankTransferAction]", e);
    return fail("Could not submit the reference. Please try again.");
  }
}

/** Fee already CONFIRMED (e.g. after a rejection) -> resubmit without paying again. */
export async function submitForReviewAction(
  feeId: string,
): Promise<Fail | { success: true; message: string }> {
  try {
    const { user, fee } = await ownerFee(feeId);
    if (fee.status !== "CONFIRMED" && fee.status !== "PENDING")
      return fail("Pay or submit a bank reference for the entry fee first.");
    const moved = await prisma.$transaction((tx) =>
      submitForReviewTx(tx, fee.auctionId),
    );
    if (!moved) return fail("This auction is already submitted for review.");
    await logAudit({
      actorId: user.id,
      action: "AUCTION_RESUBMITTED",
      module: "AUCTIONS",
      entityType: "Auction",
      entityId: fee.auctionId,
    });
    await notifyAdmins({
      type: "AUCTION_SUBMITTED",
      title: "Listing awaiting approval",
      body: `${user.name} resubmitted a listing for review.`,
      link: "/admin?tab=listings",
    });
    refresh();
    return { success: true, message: "Submitted for review." };
  } catch (e) {
    if (e instanceof EntryFeeError) return fail(e.message);
    console.error("[submitForReviewAction]", e);
    return fail("Could not submit. Please try again.");
  }
}

/* ── Admin: independent verification of a bank transfer ── */
export async function verifyBankTransferAction(
  formData: FormData,
): Promise<Fail | { success: true; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Unauthorized");
    const decision = str(formData, "decision");
    const note = str(formData, "note").trim();
    if (decision !== "CONFIRM" && decision !== "REJECT")
      return fail("Invalid decision.");
    if (decision === "REJECT" && note.length < 5)
      return fail("Give a reason when rejecting a payment.");

    const fee = await prisma.auctionEntryFee.findUnique({
      where: { id: str(formData, "feeId") },
      include: { auction: { select: { id: true, sellerId: true } } },
    });
    if (!fee || fee.method !== "BANK_TRANSFER" || fee.status !== "PENDING")
      return fail("No bank transfer is waiting for verification.");
    assertCanVerify(user, fee, fee.auction);

    if (decision === "CONFIRM") {
      const r = await confirmEntryFee({
        txRef: fee.txRef,
        provider: "BANK_TRANSFER",
        eventKey: `bank:${fee.id}`,
        providerRef: fee.bankReference,
        actorId: user.id,
      });
      if (
        r.status !== "CONFIRMED" &&
        r.status !== "ALREADY" &&
        r.status !== "DUPLICATE"
      )
        return fail("Could not confirm this payment.");
    } else {
      const moved = await prisma.$transaction(async (tx) => {
        const m = await tx.auctionEntryFee.updateMany({
          where: { id: fee.id, status: "PENDING", method: "BANK_TRANSFER" },
          data: {
            status: "FAILED",
            failureReason: note,
            verifiedById: user.id,
          },
        });
        if (m.count === 1) {
          await tx.listing.update({
            where: { id: fee.listingId },
            data: { entryFeeStatus: "FAILED" },
          });
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: "ENTRY_FEE_REJECTED",
              module: "PAYMENTS",
              entityType: "AuctionEntryFee",
              entityId: fee.id,
              newValue: { reason: note },
            },
          });
        }
        return m.count;
      });
      if (moved !== 1) return fail("This payment was already handled.");
      await notify(fee.payerId, {
        type: "ENTRY_FEE_REJECTED",
        title: "Entry fee payment rejected",
        body: `Your bank transfer could not be verified: ${note}`,
        link: "/seller",
      });
    }
    refresh();
    return {
      success: true,
      message:
        decision === "CONFIRM" ? "Payment confirmed." : "Payment rejected.",
    };
  } catch (e) {
    if (e instanceof EntryFeeError) return fail(e.message);
    console.error("[verifyBankTransferAction]", e);
    return fail("Could not update the payment.");
  }
}
