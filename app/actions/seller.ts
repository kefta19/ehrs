"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify, notifyAdmins } from "@/lib/notify";
import { logAudit } from "@/lib/security";

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
  return { success: true, message: "KYC documents submitted. Your profile is currently under admin review." };
}

export async function createListingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const categoryId = formData.get("categoryId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const city = formData.get("city") as string;
  const region = (formData.get("region") as string) || city;
  const address = formData.get("address") as string;
  const referenceNumber = formData.get("referenceNumber") as string;
  const condition = (formData.get("condition") as any) || "NOT_APPLICABLE";
  const featuresRaw = (formData.get("features") as string) || "";
  const imageUrlsRaw = (formData.get("imageUrls") as string) || "";
  const docTitle = (formData.get("docTitle") as string) || "Ownership / Legal Deed Certificate";
  const docUrl = (formData.get("docUrl") as string) || "";
  const docType = (formData.get("docType") as string) || "TITLE_DEED";

  // Dynamic attributes based on category
  const attributesRaw = (formData.get("attributes") as string) || "{}";
  let attributes = {};
  try {
    attributes = JSON.parse(attributesRaw);
  } catch {}

  if (!title || !description || !city || !categoryId) {
    return { success: false, error: "Please fill in all required fields (Category, Title, City, Description)." };
  }

  const features = featuresRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const images = imageUrlsRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const listing = await prisma.listing.create({
    data: {
      sellerId: user.id,
      categoryId,
      title,
      description,
      city,
      region,
      address,
      referenceNumber: referenceNumber || undefined,
      condition,
      features,
      attributes,
      status: "APPROVED", // Auto-approved for verified demo or set to PENDING_REVIEW
      images: {
        create: images.length > 0
          ? images.map((url, idx) => ({ url, isPrimary: idx === 0, displayOrder: idx + 1 }))
          : [{ url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80", isPrimary: true, displayOrder: 1 }],
      },
      documents: {
        create: docUrl
          ? [{ title: docTitle, fileUrl: docUrl, documentType: docType, isVerified: true }]
          : [{ title: docTitle, fileUrl: "/docs/ownership.pdf", documentType: docType, isVerified: true }],
      },
    },
  });

  await notifyAdmins({
    type: "LISTING_CREATED",
    title: "New Auction Item Created",
    body: `${user.name} created a new listing: "${title}".`,
    link: `/admin?tab=listings`,
  });

  await logAudit({
    actorId: user.id,
    action: "LISTING_CREATED",
    module: "LISTINGS",
    entityType: "Listing",
    entityId: listing.id,
  });

  revalidatePath("/seller");
  revalidatePath("/provider");
  revalidatePath("/");
  return { success: true, message: `Listing "${title}" created successfully! You can now create an auction for it.` };
}

export async function createAuctionAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const listingId = formData.get("listingId") as string;
  const startingPrice = parseFloat(formData.get("startingPrice") as string);
  const reservePriceRaw = formData.get("reservePrice") as string;
  const reservePrice = reservePriceRaw ? parseFloat(reservePriceRaw) : undefined;
  const minBidIncrement = parseFloat(formData.get("minBidIncrement") as string);
  const startAtStr = formData.get("startAt") as string;
  const endAtStr = formData.get("endAt") as string;
  const terms = (formData.get("terms") as string) || "";

  if (!listingId || isNaN(startingPrice) || isNaN(minBidIncrement) || !startAtStr || !endAtStr) {
    return { success: false, error: "Please enter all auction parameters accurately." };
  }

  const startAt = new Date(startAtStr);
  const endAt = new Date(endAtStr);

  if (endAt <= startAt) {
    return { success: false, error: "Auction closing time must be strictly after the start time." };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing || listing.sellerId !== user.id) {
    return { success: false, error: "Listing not found or you do not have permission to auction it." };
  }

  const now = new Date();
  const initialStatus = startAt <= now ? "ACTIVE" : "SCHEDULED";

  const auction = await prisma.auction.create({
    data: {
      listingId,
      sellerId: user.id,
      startingPrice,
      reservePrice: reservePrice || null,
      minBidIncrement,
      currentHighestBid: 0,
      startAt,
      endAt,
      status: initialStatus,
      terms,
    },
    include: { listing: true },
  });

  await notifyAdmins({
    type: "AUCTION_CREATED",
    title: "New Auction Scheduled",
    body: `${user.name} created auction for "${listing.title}" starting at $${startingPrice.toLocaleString()}.`,
    link: `/admin?tab=auctions`,
  });

  await logAudit({
    actorId: user.id,
    action: "AUCTION_CREATED",
    module: "AUCTIONS",
    entityType: "Auction",
    entityId: auction.id,
    newValue: { startingPrice, minBidIncrement, startAt, endAt },
  });

  revalidatePath("/seller");
  revalidatePath("/provider");
  revalidatePath("/");
  return { success: true, message: `Auction scheduled successfully!` };
}

export async function cancelAuctionAction(auctionId: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { bids: true },
  });

  if (!auction || auction.sellerId !== user.id) {
    return { success: false, error: "Auction not found or permission denied." };
  }

  if (auction.bids.length > 0) {
    return {
      success: false,
      error: "Cannot cancel an auction that has already received active bids. Please contact admin.",
    };
  }

  await prisma.auction.update({
    where: { id: auctionId },
    data: { status: "CANCELLED" },
  });

  await logAudit({
    actorId: user.id,
    action: "AUCTION_CANCELLED",
    module: "AUCTIONS",
    entityType: "Auction",
    entityId: auctionId,
  });

  revalidatePath("/seller");
  revalidatePath("/provider");
  return { success: true, message: "Auction cancelled successfully." };
}

