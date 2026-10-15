import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { roleHome } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { CustomerDashboardClient } from "@/components/customer-dashboard-client";
import { syncAuctionStatuses } from "@/lib/auction-lifecycle";

export const dynamic = "force-dynamic";

export default async function CustomerPage() {
  await syncAuctionStatuses();

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "BUYER" && user.role !== "ADMIN") redirect(roleHome(user.role));

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
          ...(user.tenantId ? { tenantId: user.tenantId } : {}),
        },
      },
      include: {
        listing: {
          include: {
            images: { orderBy: { displayOrder: "asc" } },
            documents: true,
            category: true,
            seller: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                sellerProfile: {
                  select: {
                    businessName: true,
                    address: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
        highestBidder: true,
        bids: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.bid.findMany({
      where: { bidderId: user.id },
      include: {
        auction: {
          include: {
            listing: {
              include: {
                category: true,
                images: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auctionResult.findMany({
      where: { winningBidderId: user.id },
      include: {
        auction: {
          include: {
            listing: {
              include: {
                category: true,
                images: true,
              },
            },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.watchlistItem.findMany({
      where: { userId: user.id },
      include: {
        auction: {
          include: {
            listing: {
              include: {
                category: true,
                images: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { payerId: user.id },
      include: {
        auctionResult: {
          include: {
            auction: {
              include: {
                listing: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.ticket.findMany({
      where: { createdById: user.id },
      orderBy: { createdAt: "desc" },
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
  // cspell:enable

  // Fetch buyer's bid registrations for all visible auctions
  const auctionIds = auctions.map((a) => a.id);
  const bidRegistrations = auctionIds.length
    ? await prisma.buyerBidRegistration.findMany({
        where: { auctionId: { in: auctionIds }, buyerId: user.id },
        select: { auctionId: true, status: true, feeAmount: true, id: true },
      })
    : [];

  const dashboardUser = userProfile
    ? {
        ...user,
        ...userProfile,
        phone: userProfile.phone ?? user.phone ?? undefined,
        buyerProfile: userProfile.buyerProfile
          ? {
              address: userProfile.buyerProfile.address ?? undefined,
              preferredLocation:
                userProfile.buyerProfile.preferredLocation ?? undefined,
            }
          : undefined,
      }
    : {
        ...user,
        phone: user.phone ?? undefined,
      };

  return (
    // cspell:disable
    <CustomerDashboardClient
      user={dashboardUser}
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
