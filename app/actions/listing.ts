"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  revalidatePath("/seller");
  revalidatePath("/provider");
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, message: "Listing deleted." };
}
