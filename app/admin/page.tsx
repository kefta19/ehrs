import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { roleHome } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  AdminDashboardClient,
  type AdminUser,
} from "@/components/admin-dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect(roleHome(user.role));

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
    tickets,
    categories,
    systemSettings,
    auditLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.sellerProfile.count({ where: { status: "PENDING" } }),
    prisma.auction.count({ where: { status: "ACTIVE" } }),
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.payment.findMany({ select: { amount: true, status: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.sellerProfile.findMany({
      where: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.listing.findMany({
      include: {
        seller: true,
        category: true,
        images: true,
        documents: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auction.findMany({
      include: {
        listing: { include: { category: true } },
        seller: true,
        bids: { take: 10, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.bid.findMany({
      include: {
        bidder: true,
        auction: { include: { listing: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
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
  ]);

  const totalVolume = allPayments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const dashboardUser = JSON.parse(JSON.stringify(user)) as unknown as AdminUser;

  return (
    <AdminDashboardClient
      user={dashboardUser}
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
      payments={JSON.parse(JSON.stringify(allPayments))}
      tickets={JSON.parse(JSON.stringify(tickets))}
      categories={JSON.parse(JSON.stringify(categories))}
      systemSettings={JSON.parse(JSON.stringify(systemSettings))}
      auditLogs={JSON.parse(JSON.stringify(auditLogs))}
    />
  );
}
