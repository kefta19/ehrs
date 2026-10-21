import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { roleHome } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { CustomerDashboardClient } from "@/components/customer-dashboard-client";
import { syncAuctionStatuses } from "@/lib/auction-lifecycle";
import { isGoogleOnlyAccount } from "@/lib/account";

export const dynamic = "force-dynamic";

export default async function CustomerPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
} = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "BUYER" && user.role !== "ADMIN") redirect(roleHome(user.role));

  const resolvedParams = searchParams ? await searchParams : {};
  const initialTab = resolvedParams?.tab || "dashboard";

  // Run auction status sync in background without blocking page render
  syncAuctionStatuses().catch((e) => console.error("Auction sync error:", e));

  // cspell:disable
  const [
    auctions,
    myBids,
    wonAuctions,
    watchlist,
    payments,
    tickets,
    notifications,
    categories,
    userProfile,
  ] = await Promise.all([
    prisma.auction.findMany({
      where: {
        status: { in: ["ACTIVE", "SCHEDULED"] },
        listing: {
          status: "APPROVED",
          ...(user.tenantId
            ? {
              OR: [{ tenantId: user.tenantId }, { tenantId: null }],
            }
            : {}),
        },
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            city: true,
            region: true,
            features: true,
            images: { orderBy: { displayOrder: "asc" }, take: 3 },
            category: {
              select: { id: true, name: true, slug: true, icon: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.bid.findMany({
      where: { bidderId: user.id },
      include: {
        auction: {
          include: {
            listing: {
              select: {
                id: true,
                title: true,
                city: true,
                images: { take: 1 },
                category: {
                  select: { id: true, name: true, slug: true, icon: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.auctionResult.findMany({
      where: { winningBidderId: user.id },
      include: {
        auction: {
          include: {
            listing: {
              select: {
                id: true,
                title: true,
                city: true,
                images: { take: 1 },
                category: {
                  select: { id: true, name: true, slug: true, icon: true },
                },
              },
            },
          },
        },
        payments: { take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.watchlistItem.findMany({
      where: { userId: user.id },
      include: {
        auction: {
          include: {
            listing: {
              select: {
                id: true,
                title: true,
                city: true,
                images: { take: 1 },
                category: {
                  select: { id: true, name: true, slug: true, icon: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.payment.findMany({
      where: { payerId: user.id },
      include: {
        auctionResult: {
          include: {
            auction: {
              include: {
                listing: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.ticket.findMany({
      where: { createdById: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      include: { buyerProfile: true },
    }),
  ]);
  const googleOnlyAccount = await isGoogleOnlyAccount(user.id);
  // cspell:enable

  // Fetch buyer's bid registrations & entry fees for all visible auctions
  const auctionIds = auctions.map((a) => a.id);
  const [bidRegistrations, buyerEntryFees] = auctionIds.length
    ? await Promise.all([
      prisma.buyerBidRegistration.findMany({
        where: { auctionId: { in: auctionIds }, buyerId: user.id },
        select: { auctionId: true, status: true },
      }),
      prisma.buyerAuctionEntryFee.findMany({
        where: { auctionId: { in: auctionIds }, buyerId: user.id },
        select: { auctionId: true, status: true, amount: true, id: true, txRef: true, method: true },
      }),
    ])
    : [[], []];

  const paidEntranceFeeAuctionIds = Array.from(
    new Set([
      ...bidRegistrations
        .filter((r) => r.status === "PAID" || r.status === "WAIVED")
        .map((r) => r.auctionId),
      ...buyerEntryFees
        .filter((f) => f.status === "CONFIRMED")
        .map((f) => f.auctionId),
    ])
  );

  const dashboardUser = {
    id: user.id,
    name: userProfile?.name ?? user.name,
    email: userProfile?.email ?? user.email,
    phone: userProfile?.phone ?? user.phone ?? undefined,
    avatarUrl: userProfile?.avatarUrl ?? user.avatarUrl,
    buyerProfile: userProfile?.buyerProfile
      ? {
        address: userProfile.buyerProfile.address ?? undefined,
        preferredLocation:
          userProfile.buyerProfile.preferredLocation ?? undefined,
      }
      : undefined,
  };

  return (
    // cspell:disable
    <CustomerDashboardClient
      user={dashboardUser}
      isGoogleOnlyAccount={googleOnlyAccount}
      initialTab={initialTab}
      paidEntranceFeeAuctionIds={paidEntranceFeeAuctionIds}
      auctions={JSON.parse(JSON.stringify(auctions))}
      myBids={JSON.parse(JSON.stringify(myBids))}
      wonAuctions={JSON.parse(JSON.stringify(wonAuctions))}
      watchlist={JSON.parse(JSON.stringify(watchlist))}
      payments={JSON.parse(JSON.stringify(payments))}
      tickets={JSON.parse(JSON.stringify(tickets))}
      notifications={JSON.parse(JSON.stringify(notifications))}
      categories={JSON.parse(JSON.stringify(categories))}
    />
    // cspell:enable
  );
}
