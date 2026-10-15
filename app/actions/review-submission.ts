"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { notify } from "@/lib/notify";
import { assertTransition } from "@/lib/auction-state";
import { buildChecklist, failedItems } from "@/lib/listing-readiness";
import { crossTenant } from "@/lib/tenant";
import { syncAuctionStatuses } from "@/lib/auction-lifecycle";

type Fail = { success: false; error: string };
const fail = (error: string): Fail => ({ success: false, error });
const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

export async function reviewSubmissionAction(
  formData: FormData,
): Promise<Fail | { success: true; message: string }> {
  const user = await getCurrentUser();
  if (!user || !can(user, "listing:approve")) return fail("Unauthorized");

  const auctionId = str(formData, "auctionId");
  const decision = str(formData, "decision");
  const reason = str(formData, "reason").trim();
  if (decision !== "APPROVE" && decision !== "REJECT")
    return fail("Invalid decision.");

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { listing: { include: { images: true } } },
  });
  if (!auction || crossTenant(user.tenantId, auction.listing.tenantId))
    return fail("Submission not found.");
  if (auction.sellerId === user.id)
    return fail("You cannot review your own listing.");
  if (
    auction.status !== "PENDING_APPROVAL" ||
    auction.listing.status !== "PENDING_REVIEW"
  )
    return fail(
      "This submission is not waiting for review (already decided?).",
    );

  const now = new Date();
  const feeStatus = auction.listing.entryFeeStatus;

  if (decision === "APPROVE") {
    if (str(formData, "confirmed") !== "true")
      return fail("Confirm that you checked the documents.");
    const missing = failedItems(buildChecklist(auction.listing, auction, now));
    if (missing.length)
      return fail(`Cannot approve: ${missing.map((m) => m.label).join("; ")}.`);
    assertTransition("PENDING_APPROVAL", "SCHEDULED", "ADMIN");

    const done = await prisma.$transaction(async (tx) => {
      const a = await tx.auction.updateMany({
        where: { id: auctionId, status: "PENDING_APPROVAL" },
        data: { status: "SCHEDULED", approvedById: user.id },
      });
      if (a.count !== 1) return false;
      await tx.listing.update({
        where: { id: auction.listingId },
        data: {
          status: "APPROVED",
          reviewedById: user.id,
          reviewedAt: now,
          rejectionReason: null,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "LISTING_APPROVED",
          module: "LISTINGS",
          entityType: "Listing",
          entityId: auction.listingId,
          previousValue: {
            listing: "PENDING_REVIEW",
            auction: "PENDING_APPROVAL",
          },
          newValue: {
            listing: "APPROVED",
            auction: "SCHEDULED",
            entryFeeStatus: feeStatus,
            reviewedAt: now.toISOString(),
            note: reason || null,
          },
        },
      });
      return true;
    });
    if (!done) return fail("This submission was already decided.");

    await syncAuctionStatuses(now);
    await notify(auction.sellerId, {
      type: "LISTING_APPROVED",
      title: "Listing approved",
      body:
        feeStatus === "CONFIRMED"
          ? `"${auction.listing.title}" was approved and is scheduled to go live at its start time.`
          : `"${auction.listing.title}" was approved. It will go live only after your entry fee is confirmed.`,
      link: "/seller",
    });
    revalidatePath("/admin");
    revalidatePath("/seller");
    revalidatePath("/buyer");
    revalidatePath("/");
    return { success: true, message: "Approved. The auction is scheduled." };
  }

  if (reason.length < 5)
    return fail("Give a reason of at least 5 characters when rejecting.");
  assertTransition("PENDING_APPROVAL", "DRAFT", "ADMIN");
  const done = await prisma.$transaction(async (tx) => {
    const a = await tx.auction.updateMany({
      where: { id: auctionId, status: "PENDING_APPROVAL" },
      data: { status: "DRAFT", approvedById: null },
    });
    if (a.count !== 1) return false;
    await tx.listing.update({
      where: { id: auction.listingId },
      data: {
        status: "REJECTED",
        reviewedById: user.id,
        reviewedAt: now,
        rejectionReason: reason,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "LISTING_REJECTED",
        module: "LISTINGS",
        entityType: "Listing",
        entityId: auction.listingId,
        previousValue: {
          listing: "PENDING_REVIEW",
          auction: "PENDING_APPROVAL",
        },
        newValue: {
          listing: "REJECTED",
          auction: "DRAFT",
          reason,
          entryFeeStatus: feeStatus,
          reviewedAt: now.toISOString(),
        },
      },
    });
    return true;
  });
  if (!done) return fail("This submission was already decided.");
  await notify(auction.sellerId, {
    type: "LISTING_REJECTED",
    title: "Listing rejected",
    body: `"${auction.listing.title}" was rejected: ${reason}. Fix it and resubmit. Your entry fee is kept while the starting price stays the same.`,
    link: "/seller",
  });
  revalidatePath("/admin");
  revalidatePath("/seller");
  return { success: true, message: "Rejected. The owner was notified." };
}
