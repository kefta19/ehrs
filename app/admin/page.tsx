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
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect(roleHome(user.role));
  const { tab: initialTab } = searchParams ? await searchParams : {};

  await syncAuctionStatuses().catch((e) =>
    console.error("Auction sync error:", e),
  );

  // Fetch critical stats first (for dashboard overview)
  const [
    totalUsers,
    pendingListingsCount,
    activeAuctionsCount,
    openTicketsCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.auction.count({ where: { status: "ACTIVE" } }),
    prisma.ticket.count({ where: { status: "OPEN" } }),
  ]);

  // Fetch non-critical data in parallel
  const [
    allPayments,
    usersList,
    pendingListings,
    allAuctions,
    allBids,
    sellerProfiles,
    buyerRegistrations,
    buyerEntryFees,
    sellerEntryFees,
    tickets,
    categories,
    systemSettings,
    auditLogs,
    notifications,
  ] = await Promise.all([
    prisma.payment.findMany({
      select: {
        id: true,
        transactionRef: true,
        amount: true,
        currency: true,
        method: true,
        status: true,
        receiptUrl: true,
        notes: true,
        paidAt: true,
        createdAt: true,
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
        auctionResult: {
          select: {
            id: true,
            auction: {
              select: {
                id: true,
                listing: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
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

    prisma.listing.findMany({
      include: {
        seller: {
          include: {
            sellerProfile: true,
          },
        },
        category: true,
        images: { orderBy: { displayOrder: "asc" }, take: 3 },
        documents: { take: 5 },
        biometricVerification: true,
        entryFees: { orderBy: { createdAt: "desc" }, take: 3 },
        auctions: {
          include: {
            entryFees: { orderBy: { createdAt: "desc" }, take: 3 },
            bids: { orderBy: { amount: "desc" }, take: 5 },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.auction.findMany({
      include: {
        listing: {
          include: {
            category: true,
            images: { take: 3 },
            documents: { take: 3 },
            seller: { include: { sellerProfile: true } },
          },
        },
        seller: { include: { sellerProfile: true } },
        entryFees: { orderBy: { createdAt: "desc" }, take: 3 },
        bids: { take: 10, orderBy: { createdAt: "desc" } },
        result: {
          select: {
            winningAmount: true,
            reserveMet: true,
            winningBidder: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.bid.findMany({
      include: {
        bidder: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            role: true,
            status: true,
            createdAt: true,
            emailVerifiedAt: true,
            buyerProfile: {
              select: {
                address: true,
                preferredLocation: true,
                idDocumentUrl: true,
                isVerified: true,
              },
            },
          },
        },
        auction: {
          select: {
            id: true,
            status: true,
            startAt: true,
            endAt: true,
            startingPrice: true,
            reservePrice: true,
            minBidIncrement: true,
            currentHighestBid: true,
            terms: true,
            seller: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                status: true,
                createdAt: true,
                sellerProfile: {
                  select: {
                    nationalIdNumber: true,
                    businessName: true,
                    taxId: true,
                    address: true,
                    idDocumentUrl: true,
                    status: true,
                  },
                },
              },
            },
            listing: {
              select: {
                id: true,
                title: true,
                description: true,
                condition: true,
                address: true,
                city: true,
                region: true,
                country: true,
                postalCode: true,
                referenceNumber: true,
                features: true,
                attributes: true,
                status: true,
                videoUrl: true,
                ownerNationalId: true,
                idDocumentMediaId: true,
                createdAt: true,
                category: { select: { name: true } },
                images: {
                  orderBy: { displayOrder: "asc" },
                  select: { id: true, url: true, isPrimary: true },
                },
                documents: {
                  select: {
                    id: true,
                    title: true,
                    documentType: true,
                    fileUrl: true,
                    isVerified: true,
                  },
                },
                seller: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    role: true,
                    status: true,
                    createdAt: true,
                    sellerProfile: {
                      select: {
                        nationalIdNumber: true,
                        businessName: true,
                        taxId: true,
                        address: true,
                        idDocumentUrl: true,
                        status: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.sellerProfile.findMany({
      select: {
        id: true,
        nationalIdNumber: true,
        businessName: true,
        taxId: true,
        address: true,
        idDocumentUrl: true,
        status: true,
        createdAt: true,
        user: {
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
      orderBy: { createdAt: "asc" },
    }),
    prisma.buyerBidRegistration.findMany({
      select: {
        id: true,
        buyerId: true,
        auctionId: true,
        feeAmount: true,
        currency: true,
        paymentMethod: true,
        paymentProofUrl: true,
        status: true,
        txRef: true,
        paidAt: true,
        createdAt: true,
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
            emailVerifiedAt: true,
            buyerProfile: {
              select: {
                address: true,
                preferredLocation: true,
                idDocumentUrl: true,
                isVerified: true,
              },
            },
          },
        },
        auction: {
          select: {
            id: true,
            listing: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.buyerAuctionEntryFee.findMany({
      select: {
        id: true,
        buyerId: true,
        auctionId: true,
        amount: true,
        currency: true,
        method: true,
        status: true,
        txRef: true,
        confirmedAt: true,
        createdAt: true,
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
            emailVerifiedAt: true,
            buyerProfile: {
              select: {
                address: true,
                preferredLocation: true,
                idDocumentUrl: true,
                isVerified: true,
              },
            },
          },
        },
        auction: {
          select: {
            id: true,
            listing: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auctionEntryFee.findMany({
      select: {
        id: true,
        amount: true,
        currency: true,
        method: true,
        status: true,
        txRef: true,
        transactionUrl: true,
        confirmedAt: true,
        createdAt: true,
        payer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
            emailVerifiedAt: true,
            sellerProfile: {
              select: {
                nationalIdNumber: true,
                businessName: true,
                taxId: true,
                address: true,
                idDocumentUrl: true,
                status: true,
              },
            },
          },
        },
        auction: {
          select: {
            id: true,
            listing: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
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

  const registeredBuyerKeys = new Set(
    buyerRegistrations.map(
      (registration) => `${registration.auctionId}:${registration.buyerId}`,
    ),
  );
  const entryFeePayments = [
    ...buyerRegistrations.map((registration) => ({
      id: registration.id,
      role: "BUYER" as const,
      payer: registration.buyer,
      auctionTitle: registration.auction.listing.title,
      amount: Number(registration.feeAmount),
      currency: registration.currency,
      method: registration.paymentMethod,
      status: registration.status,
      transactionRef: registration.txRef ?? "—",
      transactionUrl: registration.paymentProofUrl,
      payerDetails: {
        phone: registration.buyer.phone,
        accountStatus: registration.buyer.status,
        joinedAt: registration.buyer.createdAt.toISOString(),
        emailVerified: Boolean(registration.buyer.emailVerifiedAt),
        address: registration.buyer.buyerProfile?.address ?? null,
        preferredLocation:
          registration.buyer.buyerProfile?.preferredLocation ?? null,
        isVerified: registration.buyer.buyerProfile?.isVerified ?? false,
        nationalIdNumber: null,
        businessName: null,
        taxId: null,
        identityAddress: null,
        idDocumentUrl: registration.buyer.buyerProfile?.idDocumentUrl ?? null,
        verificationStatus: null,
      },
      confirmedAt: registration.paidAt?.toISOString() ?? null,
      createdAt: registration.createdAt.toISOString(),
    })),
    ...buyerEntryFees
      .filter(
        (fee) => !registeredBuyerKeys.has(`${fee.auctionId}:${fee.buyerId}`),
      )
      .map((fee) => ({
        id: fee.id,
        role: "BUYER" as const,
        payer: fee.buyer,
        auctionTitle: fee.auction.listing.title,
        amount: Number(fee.amount),
        currency: fee.currency,
        method: fee.method,
        status: fee.status,
        transactionRef: fee.txRef,
        transactionUrl: null,
        payerDetails: {
          phone: fee.buyer.phone,
          accountStatus: fee.buyer.status,
          joinedAt: fee.buyer.createdAt.toISOString(),
          emailVerified: Boolean(fee.buyer.emailVerifiedAt),
          address: fee.buyer.buyerProfile?.address ?? null,
          preferredLocation: fee.buyer.buyerProfile?.preferredLocation ?? null,
          isVerified: fee.buyer.buyerProfile?.isVerified ?? false,
          nationalIdNumber: null,
          businessName: null,
          taxId: null,
          identityAddress: null,
          idDocumentUrl: fee.buyer.buyerProfile?.idDocumentUrl ?? null,
          verificationStatus: null,
        },
        confirmedAt: fee.confirmedAt?.toISOString() ?? null,
        createdAt: fee.createdAt.toISOString(),
      })),
    ...sellerEntryFees.map((fee) => ({
      id: fee.id,
      role: "SELLER" as const,
      payer: fee.payer,
      auctionTitle: fee.auction.listing.title,
      amount: Number(fee.amount),
      currency: fee.currency,
      method: fee.method,
      status: fee.status,
      transactionRef: fee.txRef,
      transactionUrl: fee.transactionUrl,
      payerDetails: {
        phone: fee.payer.phone,
        accountStatus: fee.payer.status,
        joinedAt: fee.payer.createdAt.toISOString(),
        emailVerified: Boolean(fee.payer.emailVerifiedAt),
        address: null,
        preferredLocation: null,
        isVerified: fee.payer.sellerProfile?.status === "APPROVED",
        nationalIdNumber: fee.payer.sellerProfile?.nationalIdNumber ?? null,
        businessName: fee.payer.sellerProfile?.businessName ?? null,
        taxId: fee.payer.sellerProfile?.taxId ?? null,
        identityAddress: fee.payer.sellerProfile?.address ?? null,
        idDocumentUrl: fee.payer.sellerProfile?.idDocumentUrl ?? null,
        verificationStatus: fee.payer.sellerProfile?.status ?? null,
      },
      confirmedAt: fee.confirmedAt?.toISOString() ?? null,
      createdAt: fee.createdAt.toISOString(),
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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
        pendingListingsCount,
        activeAuctionsCount,
        totalVolume,
        openTicketsCount,
      }}
      usersList={JSON.parse(JSON.stringify(usersList))}
      pendingListings={JSON.parse(JSON.stringify(pendingListings))}
      allAuctions={JSON.parse(JSON.stringify(allAuctions))}
      allBids={JSON.parse(JSON.stringify(allBids))}
      sellerProfiles={JSON.parse(JSON.stringify(sellerProfiles))}
      buyerRegistrations={JSON.parse(JSON.stringify(buyerRegistrations))}
      entryFeePayments={entryFeePayments}
      tickets={JSON.parse(JSON.stringify(tickets))}
      categories={JSON.parse(JSON.stringify(categories))}
      systemSettings={JSON.parse(JSON.stringify(systemSettings))}
      auditLogs={JSON.parse(JSON.stringify(auditLogs))}
      notifications={JSON.parse(JSON.stringify(notifications))}
    />
  );
}
