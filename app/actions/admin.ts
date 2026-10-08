"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { logAudit } from "@/lib/security";

export async function verifySellerKycAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const sellerProfileId = formData.get("sellerProfileId") as string;
  const status = formData.get("status") as
    | "APPROVED"
    | "REJECTED"
    | "UNDER_REVIEW";
  const reviewNote = (formData.get("reviewNote") as string) || "";

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { id: sellerProfileId },
    include: { user: true },
  });

  if (!sellerProfile)
    return { success: false, error: "Seller profile not found." };

  const prevStatus = sellerProfile.status;

  await prisma.sellerProfile.update({
    where: { id: sellerProfileId },
    data: {
      status,
      reviewedById: user.id,
      reviewedAt: new Date(),
      reviewNote,
    },
  });

  await logAudit({
    actorId: user.id,
    action: `SELLER_KYC_${status}`,
    module: "KYC",
    entityType: "SellerProfile",
    entityId: sellerProfileId,
    previousValue: { status: prevStatus },
    newValue: { status, reviewNote },
  });

  await notify(sellerProfile.userId, {
    type: `SELLER_KYC_${status}`,
    title:
      status === "APPROVED"
        ? "Seller Account Approved!"
        : `KYC Status: ${status}`,
    body:
      status === "APPROVED"
        ? "Congratulations! Your seller verification has been approved. You can now create property and asset auction listings."
        : `Your seller verification was marked as ${status}. Review notes: ${reviewNote || "No notes provided."}`,
    link: `/seller`,
  });

  revalidatePath("/admin");
  revalidatePath("/seller");
  return { success: true, message: `Seller KYC updated to ${status}.` };
}

export async function reviewListingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const listingId = formData.get("listingId") as string;
  const status = formData.get("status") as "APPROVED" | "REJECTED";
  const rejectionReason = (formData.get("rejectionReason") as string) || "";

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { seller: true },
  });

  if (!listing) return { success: false, error: "Listing not found." };

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      status,
      reviewedById: user.id,
      rejectionReason: status === "REJECTED" ? rejectionReason : null,
    },
  });

  await logAudit({
    actorId: user.id,
    action: `LISTING_${status}`,
    module: "LISTINGS",
    entityType: "Listing",
    entityId: listingId,
    newValue: { status, rejectionReason },
  });

  await notify(listing.sellerId, {
    type: `LISTING_${status}`,
    title: status === "APPROVED" ? "Listing Approved!" : "Listing Rejected",
    body:
      status === "APPROVED"
        ? `Your listing "${listing.title}" was approved by administrator. You can now schedule an auction for it.`
        : `Your listing "${listing.title}" was rejected. Reason: ${rejectionReason || "Please verify documentation and resubmit."}`,
    link: `/seller`,
  });

  revalidatePath("/admin");
  revalidatePath("/seller");
  revalidatePath("/");
  return { success: true, message: `Listing marked as ${status}.` };
}

export async function updateAuctionStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const auctionId = formData.get("auctionId") as string;
  const status = formData.get("status") as any; // ACTIVE, SCHEDULED, SUSPENDED, CANCELLED, CLOSED

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { listing: true },
  });

  if (!auction) return { success: false, error: "Auction not found." };

  await prisma.auction.update({
    where: { id: auctionId },
    data: {
      status,
      approvedById: user.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: `AUCTION_${status}`,
    module: "AUCTIONS",
    entityType: "Auction",
    entityId: auctionId,
    newValue: { status },
  });

  await notify(auction.sellerId, {
    type: `AUCTION_STATUS_CHANGED`,
    title: `Auction Status: ${status}`,
    body: `Your auction for "${auction.listing.title}" is now set to ${status}.`,
    link: `/seller`,
  });

  revalidatePath("/admin");
  revalidatePath("/seller");
  revalidatePath("/buyer");
  revalidatePath("/");
  return { success: true, message: `Auction status set to ${status}.` };
}

export async function verifyPaymentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const paymentId = formData.get("paymentId") as string;
  const status = formData.get("status") as any; // PAID, REFUNDED, FAILED
  const notes = (formData.get("notes") as string) || "";

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      auctionResult: { include: { auction: { include: { listing: true } } } },
      payer: true,
    },
  });

  if (!payment) return { success: false, error: "Payment record not found." };

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status,
      verifiedById: user.id,
      notes: notes || payment.notes,
      paidAt: status === "PAID" ? new Date() : payment.paidAt,
    },
  });

  if (status === "PAID") {
    await prisma.auctionResult.update({
      where: { id: payment.auctionResultId },
      data: { isSettled: true },
    });
    await prisma.auction.update({
      where: { id: payment.auctionResult.auctionId },
      data: { status: "COMPLETED" },
    });
  }

  await logAudit({
    actorId: user.id,
    action: `PAYMENT_${status}`,
    module: "PAYMENTS",
    entityType: "Payment",
    entityId: paymentId,
    newValue: { status, notes },
  });

  await notify(payment.payerId, {
    type: `PAYMENT_${status}`,
    title:
      status === "PAID"
        ? "Payment Confirmed & Verified!"
        : `Payment Status: ${status}`,
    body:
      status === "PAID"
        ? `Your payment of $${Number(payment.amount).toLocaleString()} for "${payment.auctionResult.auction.listing.title}" has been verified in escrow.`
        : `Your payment was updated to ${status}. Notes: ${notes || "Contact billing for details."}`,
    link: `/buyer?tab=payments`,
  });

  revalidatePath("/admin");
  revalidatePath("/buyer");
  return { success: true, message: `Payment updated to ${status}.` };
}

export async function updateTicketStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const ticketId = formData.get("ticketId") as string;
  const status = formData.get("status") as any; // UNDER_INVESTIGATION, RESOLVED, CLOSED
  const resolution = (formData.get("resolution") as string) || "";

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) return { success: false, error: "Ticket not found." };

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status,
      assignedToId: user.id,
      resolution: resolution || ticket.resolution,
      resolvedAt:
        status === "RESOLVED" || status === "CLOSED"
          ? new Date()
          : ticket.resolvedAt,
    },
  });

  await logAudit({
    actorId: user.id,
    action: `TICKET_${status}`,
    module: "TICKETS",
    entityType: "Ticket",
    entityId: ticketId,
    newValue: { status, resolution },
  });

  await notify(ticket.createdById, {
    type: `TICKET_${status}`,
    title: `Ticket ${ticket.number} ${status}`,
    body: `Your ticket has been updated: ${resolution || `Status changed to ${status}.`}`,
    link: `/buyer?tab=tickets`,
  });

  revalidatePath("/admin");
  revalidatePath("/buyer");
  return { success: true, message: `Ticket updated to ${status}.` };
}

export async function updateUserStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const targetUserId = formData.get("userId") as string;
  const status = formData.get("status") as any; // ACTIVE, SUSPENDED, DEACTIVATED
  const role = formData.get("role") as any; // BUYER, SELLER, ADMIN

  if (targetUserId === user.id && status !== "ACTIVE") {
    return {
      success: false,
      error: "You cannot suspend or deactivate your own admin account.",
    };
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      status: status || undefined,
      role: role || undefined,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "USER_MODIFIED",
    module: "USERS",
    entityType: "User",
    entityId: targetUserId,
    newValue: { status, role },
  });

  revalidatePath("/admin");
  return { success: true, message: "User status updated successfully." };
}

export async function manageCategoryAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const slug = (formData.get("slug") as string).toLowerCase().trim();
  const name = formData.get("name") as string;
  const icon = formData.get("icon") as string;
  const description = formData.get("description") as string;

  if (!slug || !name) {
    return { success: false, error: "Slug and name are required." };
  }

  await prisma.category.upsert({
    where: { slug },
    create: {
      slug,
      name,
      icon: icon || "📦",
      description,
      isActive: true,
    },
    update: {
      name,
      icon: icon || undefined,
      description,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, message: `Category "${name}" saved.` };
}

export async function updateSystemSettingsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return { success: false, error: "Unauthorized" };

  const settings: Record<string, string> = {
    "system.name": formData.get("systemName") as string,
    "system.currency": formData.get("currency") as string,
    "auction.softCloseMinutes": formData.get("softCloseMinutes") as string,
    "auction.depositPercent": formData.get("depositPercent") as string,
    "platform.commissionPercent": formData.get("commissionPercent") as string,
  };

  for (const [key, value] of Object.entries(settings)) {
    if (value !== null && value !== undefined && value !== "") {
      await prisma.systemSetting.upsert({
        where: { key },
        create: {
          key,
          value: isNaN(Number(value)) ? value : Number(value),
          updatedById: user.id,
        },
        update: {
          value: isNaN(Number(value)) ? value : Number(value),
          updatedById: user.id,
        },
      });
    }
  }

  await logAudit({
    actorId: user.id,
    action: "SETTINGS_UPDATED",
    module: "SETTINGS",
    entityType: "SystemSetting",
    newValue: settings,
  });

  revalidatePath("/admin");
  return { success: true, message: "System settings saved successfully." };
}
