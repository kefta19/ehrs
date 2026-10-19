import { syncAuctionStatuses } from "@/lib/auction-lifecycle";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { roleHome } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isGoogleOnlyAccount } from "@/lib/account";
import {
  AdminDashboardClient,
  type AdminUser,
} from "@/components/admin-dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  await syncAuctionStatuses();

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect(roleHome(user.role));
  const { tab: initialTab } = searchParams ? await searchParams : {};

  const [
    totalUsers,
    pendingKycCount,
    activeAuctionsCount,
    openTicketsCount,
    allPayments,
    usersList,
    pendingKyc,
    pendingListings,
    allAuctions,
    allBids,
    pendingBuyerRegistrations,
    tickets,
    categories,
    systemSettings,
    auditLogs,
    notifications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.sellerProfile.count({ where: { status: "PENDING" } }),
    prisma.auction.count({ where: { status: "ACTIVE" } }),
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.payment.findMany({
      select: {
        id: true,
        transactionRef: true,
        amount: true,
        status: true,
        payer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.sellerProfile.findMany({
      where: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.listing.findMany({
      include: {
        seller: {
          include: {
            sellerProfile: true,
          },
        },
        category: true,
        images: { orderBy: { displayOrder: "asc" } },
        documents: true,
        biometricVerification: true,
        entryFees: { orderBy: { createdAt: "desc" } },
        auctions: {
          include: {
            entryFees: { orderBy: { createdAt: "desc" } },
            bids: { orderBy: { amount: "desc" }, take: 5 },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auction.findMany({
      include: {
        listing: {
          include: {
            category: true,
            images: true,
            documents: true,
            seller: { include: { sellerProfile: true } },
          },
        },
        seller: { include: { sellerProfile: true } },
        entryFees: { orderBy: { createdAt: "desc" } },
        bids: { take: 10, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.bid.findMany({
      include: {
        bidder: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        },
        auction: {
          select: {
            id: true,
            status: true,
            startAt: true,
            endAt: true,
            listing: { select: { title: true } },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.buyerBidRegistration.findMany({
      where: { status: "PENDING" },
      include: {
        buyer: { select: { id: true, name: true, email: true } },
        auction: { include: { listing: { select: { title: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.ticket.findMany({
      include: { createdBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
    }),
    prisma.systemSetting.findMany(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const totalVolume = allPayments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const googleOnlyAccount = await isGoogleOnlyAccount(user.id);
  const dashboardUser: AdminUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };

  return (
    <AdminDashboardClient
      user={dashboardUser}
      isGoogleOnlyAccount={googleOnlyAccount}
      initialTab={initialTab}
      stats={{
        totalUsers,
        pendingKycCount,
        activeAuctionsCount,
        totalVolume,
        openTicketsCount,
      }}
      usersList={JSON.parse(JSON.stringify(usersList))}
      pendingKyc={JSON.parse(JSON.stringify(pendingKyc))}
      pendingListings={JSON.parse(JSON.stringify(pendingListings))}
      allAuctions={JSON.parse(JSON.stringify(allAuctions))}
      allBids={JSON.parse(JSON.stringify(allBids))}
      pendingBuyerRegistrations={JSON.parse(JSON.stringify(pendingBuyerRegistrations))}
      payments={JSON.parse(JSON.stringify(allPayments))}
      tickets={JSON.parse(JSON.stringify(tickets))}
      categories={JSON.parse(JSON.stringify(categories))}
      systemSettings={JSON.parse(JSON.stringify(systemSettings))}
      auditLogs={JSON.parse(JSON.stringify(auditLogs))}
      notifications={JSON.parse(JSON.stringify(notifications))}
    />
  );
}
