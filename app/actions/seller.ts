"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify, notifyAdmins } from "@/lib/notify";
import { logAudit } from "@/lib/security";
import { can } from "@/lib/rbac";
import { assertTransition, canTransition } from "@/lib/auction-state";
import {
  BIOMETRIC_MAX_AGE_MS,
  buildChecklist,
  failedItems,
} from "@/lib/listing-readiness";
import {
  createListingSchema,
  submitAuctionSchema,
} from "@/lib/listing-validation";

type Fail = { success: false; error: string };
const fail = (error: string): Fail => ({ success: false, error });
const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

class ActionError extends Error {}

function refresh() {
  revalidatePath("/seller");
  revalidatePath("/provider");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function replyToBuyerInquiryAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SELLER") {
    return fail("Sign in with the seller account that owns this auction to reply.");
  }

  const ticketId = str(formData, "ticketId");
  const body = str(formData, "message").trim();
  if (!ticketId) return fail("This buyer inquiry could not be identified.");
  if (body.length < 2 || body.length > 2000) {
    return fail("Your reply must be between 2 and 2,000 characters.");
  }

  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      type: "SUPPORT",
      againstUserId: user.id,
      auction: { sellerId: user.id },
    },
    select: {
      id: true,
      number: true,
      subject: true,
      createdById: true,
      auction: { select: { listing: { select: { title: true } } } },
    },
  });
  if (!ticket?.auction) return fail("This inquiry was not found for one of your auctions.");

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: user.id,
        body,
        isInternal: false,
      },
    }),
    prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "OPEN" },
    }),
  ]);

  await notify(ticket.createdById, {
    type: "AUCTION_INQUIRY_REPLY",
    title: `Seller replied: ${ticket.auction.listing.title}`,
    body: `${user.name} replied to your inquiry ${ticket.number}: ${body}`,
    link: "/buyer?tab=notifications",
  });

  revalidatePath("/seller");
  revalidatePath("/provider");
  revalidatePath("/buyer");
  revalidatePath("/customer");
  return { success: true, message: "Your reply was sent to the buyer." };
}

/* ───────────────────────── KYC (unchanged) ───────────────────────── */

export async function submitSellerKycAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const nationalIdNumber = formData.get("nationalIdNumber") as string;
  const businessName = formData.get("businessName") as string;
  const taxId = formData.get("taxId") as string;
  const address = formData.get("address") as string;
  const idDocumentUrl = formData.get("idDocumentUrl") as string;

  if (!nationalIdNumber || !address) {
    return { success: false, error: "National ID and address are required." };
  }

  await prisma.sellerProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      nationalIdNumber,
      businessName: businessName || null,
      taxId: taxId || null,
      address,
      idDocumentUrl: idDocumentUrl || null,
      status: "PENDING",
    },
    update: {
      nationalIdNumber,
      businessName: businessName || null,
      taxId: taxId || null,
      address,
      idDocumentUrl: idDocumentUrl || null,
      status: "PENDING",
    },
  });

  await notifyAdmins({
    type: "SELLER_KYC_SUBMITTED",
    title: "Seller Verification Request",
    body: `${user.name} submitted seller identity documentation for verification.`,
    link: `/admin?tab=kyc`,
  });

  await logAudit({
    actorId: user.id,
    action: "SELLER_KYC_SUBMITTED",
    module: "KYC",
    entityType: "SellerProfile",
    entityId: user.id,
  });

  revalidatePath("/seller");
  revalidatePath("/provider");
  return {
    success: true,
    message:
      "KYC documents submitted. Your profile is currently under admin review.",
  };
}

/* ─────────────── STEP 1: "Add listing" (stays a private DRAFT) ─────────────── */

export async function createListingAction(
  formData: FormData,
): Promise<
  Fail | { success: true; message: string; listingId: string; title: string }
> {
  const user = await getCurrentUser();
  if (!user || !can(user, "listing:create")) return fail("Unauthorized");

  let imageIdsRaw: unknown = [];
  try {
    imageIdsRaw = JSON.parse(str(formData, "imageIds") || "[]");
  } catch {}

  const parsed = createListingSchema.safeParse({
    categoryId: str(formData, "categoryId"),
    title: str(formData, "title"),
    description: str(formData, "description"),
    city: str(formData, "city"),
    region: str(formData, "region") || undefined,
    address: str(formData, "address") || undefined,
    referenceNumber: str(formData, "referenceNumber") || undefined,
    condition: str(formData, "condition") || "NOT_APPLICABLE",
    features: str(formData, "features")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    imageIds: Array.isArray(imageIdsRaw)
      ? [...new Set(imageIdsRaw.map(String))]
      : [],
    videoUrl: str(formData, "videoUrl").trim(),
    nationalIdNumber: str(formData, "nationalIdNumber"),
    idDocumentId: str(formData, "idDocumentId"),
    ownershipDocumentId: str(formData, "ownershipDocumentId") || undefined,
    biometricVerificationId: str(formData, "biometricVerificationId"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;

  let attributes = {};
  try {
    attributes = JSON.parse(str(formData, "attributes") || "{}");
  } catch {}

  const category = await prisma.category.findFirst({
    where: { id: d.categoryId, isActive: true },
    select: { id: true },
  });
  if (!category) return fail("Selected category is not available.");

  try {
    const listing = await prisma.$transaction(async (tx) => {
      const now = new Date();

      const consumed = await tx.biometricVerification.updateMany({
        where: {
          id: d.biometricVerificationId,
          userId: user.id,
          consumedAt: null,
          createdAt: { gte: new Date(now.getTime() - BIOMETRIC_MAX_AGE_MS) },
        },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1)
        throw new ActionError(
          "Fingerprint verification expired. Please verify again.",
        );

      const wanted = [
        ...d.imageIds,
        d.idDocumentId,
        ...(d.ownershipDocumentId ? [d.ownershipDocumentId] : []),
      ];
      const files = await tx.mediaFile.findMany({
        where: { id: { in: wanted }, ownerId: user.id, attachedAt: null },
      });
      const byId = new Map(files.map((f) => [f.id, f]));
      const kindOk = (id: string, kind: string) => byId.get(id)?.kind === kind;
      if (!d.imageIds.every((id) => kindOk(id, "IMAGE")))
        throw new ActionError(
          "One of the photos is missing or invalid. Please upload it again.",
        );
      if (!kindOk(d.idDocumentId, "ID_DOCUMENT"))
        throw new ActionError(
          "The national ID file is missing or invalid. Please upload it again.",
        );
      if (
        d.ownershipDocumentId &&
        !kindOk(d.ownershipDocumentId, "OWNERSHIP_DOCUMENT")
      )
        throw new ActionError(
          "The ownership document is invalid. Please upload it again.",
        );

      const created = await tx.listing.create({
        data: {
          sellerId: user.id,
          categoryId: d.categoryId,
          title: d.title,
          description: d.description,
          city: d.city,
          region: d.region || d.city,
          address: d.address,
          referenceNumber: d.referenceNumber || undefined,
          condition: d.condition,
          features: d.features,
          attributes,
          status: "DRAFT",
          videoUrl: d.videoUrl,
          ownerNationalId: d.nationalIdNumber,
          idDocumentMediaId: d.idDocumentId,
          biometricVerificationId: d.biometricVerificationId,
          images: {
            create: d.imageIds.map((id, i) => ({
              url: `/api/media/${id}`,
              isPrimary: i === 0,
              displayOrder: i + 1,
            })),
          },
          documents: d.ownershipDocumentId
            ? {
                create: [
                  {
                    title: "Ownership / Legal Deed Certificate",
                    documentType: "TITLE_DEED",
                    fileUrl: `/api/media/${d.ownershipDocumentId}`,
                    isVerified: false,
                  },
                ],
              }
            : undefined,
        },
      });

      await tx.mediaFile.updateMany({
        where: { id: { in: wanted } },
        data: { attachedAt: now },
      });
      return created;
    });

    await logAudit({
      actorId: user.id,
      action: "LISTING_CREATED",
      module: "LISTINGS",
      entityType: "Listing",
      entityId: listing.id,
    });

    refresh();
    return {
      success: true,
      listingId: listing.id,
      title: listing.title,
      message: `Listing "${listing.title}" added. Now set the auction schedule and submit it for review.`,
    };
  } catch (err) {
    if (err instanceof ActionError) return fail(err.message);
    if ((err as { code?: string })?.code === "P2002")
      return fail(
        "A listing with this reference / parcel / VIN number already exists.",
      );
    console.error("[createListingAction]", err);
    return fail("Could not save the listing. Please try again.");
  }
}

/* ─────── STEP 2: schedule + requirements -> "Upcoming" (pending admin review) ─────── */

export async function createAuctionAction(
  formData: FormData,
): Promise<Fail | { success: true; message: string }> {
  const user = await getCurrentUser();
  if (!user || !can(user, "auction:create")) return fail("Unauthorized");

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
  if (!listing || listing.sellerId !== user.id)
    return fail(
      "Listing not found or you do not have permission to auction it.",
    );
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

  assertTransition("DRAFT", "PENDING_APPROVAL", "SELLER");

  const data = {
    startingPrice: d.startingPrice,
    reservePrice: d.reservePrice ?? null,
    minBidIncrement: d.minBidIncrement,
    startAt: new Date(d.startAt),
    endAt: new Date(d.endAt),
    terms: d.terms || null,
  };
  const draft = listing.auctions.find((a) => a.status === "DRAFT");

  const auction = await prisma.$transaction(async (tx) => {
    const a = draft
      ? await tx.auction.update({
          where: { id: draft.id },
          data: { ...data, status: "PENDING_APPROVAL", approvedById: null },
        })
      : await tx.auction.create({
          data: {
            ...data,
            listingId: listing.id,
            sellerId: user.id,
            currentHighestBid: 0,
            status: "PENDING_APPROVAL",
          },
        });
    await tx.listing.update({
      where: { id: listing.id },
      data: {
        status: "PENDING_REVIEW",
        rejectionReason: null,
        submittedAt: new Date(),
      },
    });
    return a;
  });

  await notifyAdmins({
    type: "AUCTION_SUBMITTED",
    title: "Listing awaiting approval",
    body: `${user.name} submitted "${listing.title}" for review.`,
    link: `/admin?tab=listings`,
  });
  await logAudit({
    actorId: user.id,
    action: "AUCTION_SUBMITTED",
    module: "AUCTIONS",
    entityType: "Auction",
    entityId: auction.id,
    newValue: {
      startAt: data.startAt,
      endAt: data.endAt,
      startingPrice: d.startingPrice,
    },
  });

  refresh();
  return {
    success: true,
    message:
      "Submitted! Status: Upcoming. An admin will check your documents and approve or reject it.",
  };
}

/* ───────────────────────── Cancel ───────────────────────── */

export async function cancelAuctionAction(auctionId: string) {
  const user = await getCurrentUser();
  if (!user) return fail("Unauthorized");

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      listing: { select: { id: true, status: true } },
      _count: { select: { bids: true } },
    },
  });
  if (!auction || auction.sellerId !== user.id)
    return fail("Auction not found or permission denied.");

  if (
    !canTransition(auction.status, "CANCELLED", "SELLER", {
      hasBids: auction._count.bids > 0,
    })
  ) {
    return fail(
      auction._count.bids > 0
        ? "Cannot cancel an auction that has already received bids. Please contact admin."
        : "This auction can no longer be cancelled.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.auction.update({
      where: { id: auctionId },
      data: { status: "CANCELLED" },
    });
    if (
      auction.listing.status === "PENDING_REVIEW" ||
      auction.listing.status === "APPROVED"
    ) {
      await tx.listing.update({
        where: { id: auction.listing.id },
        data: { status: "DRAFT" },
      });
    }
  });

  await logAudit({
    actorId: user.id,
    action: "AUCTION_CANCELLED",
    module: "AUCTIONS",
    entityType: "Auction",
    entityId: auctionId,
  });

  refresh();
  return { success: true as const, message: "Auction cancelled successfully." };
}
