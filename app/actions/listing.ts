"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateListingAction(
  listingId: string,
  data: {
    title?: string;
    description?: string;
    city?: string;
    region?: string;
    address?: string;
    features?: string[];
    condition?: string;
  }
) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SELLER")) {
    return { success: false, error: "You are not authorized to edit listings." };
  }

  if (!listingId.trim()) {
    return { success: false, error: "The listing could not be identified." };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      sellerId: true,
      title: true,
      status: true,
    },
  });

  if (!listing) {
    return { success: false, error: "This listing no longer exists." };
  }

  if (user.role === "SELLER" && listing.sellerId !== user.id) {
    return {
      success: false,
      error: "You can only edit your own listings.",
    };
  }

  // Only allow editing of DRAFT, REJECTED, or PENDING_REVIEW listings
  if (
    listing.status !== "DRAFT" &&
    listing.status !== "REJECTED" &&
    listing.status !== "PENDING_REVIEW"
  ) {
    return {
      success: false,
      error: "Only draft, rejected, or pending review listings can be edited.",
    };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const updated = await transaction.listing.update({
        where: { id: listing.id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description && { description: data.description }),
          ...(data.city && { city: data.city }),
          ...(data.region && { region: data.region }),
          ...(data.address && { address: data.address }),
          ...(data.features && { features: data.features }),
          ...(data.condition && { condition: data.condition as any }),
          // Reset to DRAFT if REJECTED or PENDING_REVIEW
          ...(listing.status === "REJECTED" || listing.status === "PENDING_REVIEW"
            ? { status: "DRAFT", reviewedAt: null, reviewedById: null, rejectionReason: null }
            : {}),
        },
      });

      await transaction.auditLog.create({
        data: {
          actorId: user.id,
          action: "LISTING_UPDATED",
          module: "LISTINGS",
          entityType: "Listing",
          entityId: listing.id,
          previousValue: {
            title: listing.title,
            status: listing.status,
          },
          newValue: {
            title: updated.title,
            status: updated.status,
          },
        },
      });
    });
  } catch (error) {
    console.error("[listing] Failed to update listing:", error);
    return {
      success: false,
      error: "The listing could not be updated. Refresh and try again.",
    };
  }

  // Only revalidate the current dashboard path
  // This prevents unnecessary full-page refreshes across the entire app
  revalidatePath("/admin");
  revalidatePath("/provider");

  return { success: true, message: "Listing updated successfully." };
}

export async function deleteListingAction(listingId: string) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SELLER")) {
    return { success: false, error: "You are not authorized to delete listings." };
  }

  if (!listingId.trim()) {
    return { success: false, error: "The listing could not be identified." };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      sellerId: true,
      title: true,
      status: true,
      _count: { select: { auctions: true, entryFees: true } },
    },
  });

  if (!listing) {
    return { success: false, error: "This listing no longer exists." };
  }

  if (user.role === "SELLER") {
    if (listing.sellerId !== user.id) {
      return {
        success: false,
        error: "You can only delete your own listings.",
      };
    }
    if (listing.status !== "DRAFT" && listing.status !== "REJECTED") {
      return {
        success: false,
        error: "Only draft or rejected listings can be deleted by sellers.",
      };
    }
  }

  if (listing._count.auctions > 0 || listing._count.entryFees > 0) {
    return {
      success: false,
      error: "This listing has auction or payment history and cannot be deleted.",
    };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.listing.delete({ where: { id: listing.id } });
      await transaction.auditLog.create({
        data: {
          actorId: user.id,
          action: "LISTING_DELETED",
          module: "LISTINGS",
          entityType: "Listing",
          entityId: listing.id,
          previousValue: {
            title: listing.title,
            status: listing.status,
            sellerId: listing.sellerId,
          },
        },
      });
    });
  } catch (error) {
    console.error("[listing] Failed to delete listing:", error);
    return {
      success: false,
      error: "The listing could not be deleted. Refresh and try again.",
    };
  }

  // Only revalidate the current dashboard path
  // This prevents unnecessary full-page refreshes across the entire app
  revalidatePath("/admin");
  revalidatePath("/provider");

  return { success: true, message: "Listing deleted." };
}
