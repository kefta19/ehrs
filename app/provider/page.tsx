import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { roleHome } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ProviderDashboardClient } from "@/components/provider-dashboard-client";

export const dynamic = "force-dynamic";

export default async function ProviderPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "SELLER" && user.role !== "ADMIN") redirect(roleHome(user.role));

  const [sellerProfile, listings, auctions, categories, notifications] =
    await Promise.all([
      prisma.sellerProfile.findUnique({
        where: { userId: user.id },
      }),
      prisma.listing.findMany({
        where: { sellerId: user.id },
        include: {
          category: true,
          images: { orderBy: { displayOrder: "asc" } },
          documents: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auction.findMany({
        where: { sellerId: user.id },
        include: {
          listing: {
            include: {
              category: true,
              images: true,
            },
          },
          bids: {
            orderBy: { amount: "desc" },
          },
          result: {
            include: {
              winningBidder: true,
              payments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

  return (
    <ProviderDashboardClient
      user={user}
      sellerProfile={sellerProfile ? JSON.parse(JSON.stringify(sellerProfile)) : null}
      listings={JSON.parse(JSON.stringify(listings))}
      auctions={JSON.parse(JSON.stringify(auctions))}
      categories={JSON.parse(JSON.stringify(categories))}
      notifications={JSON.parse(JSON.stringify(notifications))}
    />
  );
}
