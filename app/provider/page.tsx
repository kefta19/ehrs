import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { roleHome } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ProviderDashboardClient } from "@/components/provider-dashboard-client";
import { syncAuctionStatuses } from "@/lib/auction-lifecycle";
import { isGoogleOnlyAccount } from "@/lib/account";

export const dynamic = "force-dynamic";

export default async function ProviderPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
} = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "SELLER" && user.role !== "ADMIN") redirect(roleHome(user.role));
  const resolvedParams = searchParams ? await searchParams : {};
  const initialTab =
    resolvedParams.tab === "notifications" || resolvedParams.tab === "account"
      ? resolvedParams.tab
      : undefined;

  // Run auction status sync in background without blocking page render
  syncAuctionStatuses().catch((e) => console.error("Auction sync error:", e));

  // Fetch critical data first (listings, categories, seller profile)
  const [sellerProfile, listings, categories] = await Promise.all([
    prisma.sellerProfile.findUnique({
      where: { userId: user.id },
    }),
    prisma.listing.findMany({
      where: { sellerId: user.id },
      include: {
        category: true,
        images: { orderBy: { displayOrder: "asc" }, take: 3 },
        documents: { take: 5 },
        _count: { select: { auctions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
  ]);

  // Fetch non-critical data in parallel (auctions, notifications)
  const [auctions, notifications] = await Promise.all([
    prisma.auction.findMany({
      where: { sellerId: user.id },
      include: {
        listing: {
          include: {
            category: true,
            images: { take: 3 },
          },
        },
        bids: {
          orderBy: { amount: "desc" },
          take: 10,
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
            payment: {
              select: {
                id: true,
                amount: true,
                currency: true,
                method: true,
                status: true,
                transactionRef: true,
                createdAt: true,
                verifiedAt: true,
                rejectionReason: true,
                receiptUrl: true,
                bankReferenceUrl: true,
              },
            },
          },
        },
        entryFees: { orderBy: { createdAt: "desc" }, take: 1 },
        result: {
          include: {
            winningBidder: true,
            payments: { take: 1 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const googleOnlyAccount = await isGoogleOnlyAccount(user.id);

  return (
    <ProviderDashboardClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
      }}
      isGoogleOnlyAccount={googleOnlyAccount}
      sellerProfile={sellerProfile ? JSON.parse(JSON.stringify(sellerProfile)) : null}
      listings={JSON.parse(JSON.stringify(listings))}
      auctions={JSON.parse(JSON.stringify(auctions))}
      categories={JSON.parse(JSON.stringify(categories))}
      notifications={JSON.parse(JSON.stringify(notifications))}
      initialTab={initialTab}
    />
  );
}
