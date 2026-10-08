import "server-only";

import { hashPassword } from "./auth";
import { DEFAULT_ROLE_PERMISSIONS } from "./rbac";
import { prisma } from "./prisma";
import { seedCategories } from "./categories";

let booted: Promise<void> | null = null;

/** Idempotent bootstrap for Property & Asset Auction System */
export function ensureBootstrap() {
  booted ??= run().catch((e) => {
    booted = null;
    throw e;
  });
  return booted;
}

async function run() {
  // 1. Roles
  for (const [baseRole, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    await prisma.role.upsert({
      where: { name: baseRole },
      update: {},
      create: {
        name: baseRole,
        baseRole: baseRole as "BUYER" | "SELLER" | "ADMIN",
        permissions,
        isSystem: true,
      },
    });
  }

  // 2. Categories
  await seedCategories(prisma);

  // 3. System Settings
  const defaults: Record<string, unknown> = {
    "system.name": "ETHome - Online Auction Marketplace",
    "system.currency": "USD",
    "system.timezone": "Africa/Addis_Ababa",
    "auction.softCloseMinutes": 5,
    "auction.depositPercent": 10,
    "auction.settlementHours": 72,
    "platform.commissionPercent": 2.5,
    "contact.phone": "+251 11 123 4567",
    "contact.email": "info@ethome.com",
    "contact.address": "Bole Subcity, Addis Ababa, Ethiopia",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as never },
    });
  }

  // 4. Admin Account
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@ethome.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";
  const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", status: "ACTIVE" },
    create: {
      name: "Platform Executive Admin",
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: "ADMIN",
      roleId: adminRole?.id,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });

  // Also ensure default admin@propertyauction.et exists
  if (adminEmail !== "admin@propertyauction.et") {
    await prisma.user.upsert({
      where: { email: "admin@propertyauction.et" },
      update: {},
      create: {
        name: "ETHome Admin",
        email: "admin@propertyauction.et",
        passwordHash: await hashPassword("Admin@1234"),
        role: "ADMIN",
        roleId: adminRole?.id,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });
  }

  // 5. Seed Verified Seller and Sample Buyers
  const sellerRole = await prisma.role.findUnique({ where: { name: "SELLER" } });
  const buyerRole = await prisma.role.findUnique({ where: { name: "BUYER" } });

  // Getachew Abebe (Customer / Buyer from screenshot)
  const getachew = await prisma.user.upsert({
    where: { email: "buyer@propertyauction.et" },
    update: { name: "Getachew Abebe" },
    create: {
      name: "Getachew Abebe",
      email: "buyer@propertyauction.et",
      passwordHash: await hashPassword("Buyer@1234"),
      role: "BUYER",
      roleId: buyerRole?.id,
      status: "ACTIVE",
      phone: "+251911223344",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      emailVerifiedAt: new Date(),
      buyerProfile: {
        create: {
          address: "Bole Subcity, Addis Ababa",
          preferredLocation: "Addis Ababa, Bole",
          isVerified: true,
        },
      },
    },
    include: { buyerProfile: true },
  });

  // Competing Buyer: Hanna Worku
  const hanna = await prisma.user.upsert({
    where: { email: "hanna@propertyauction.et" },
    update: {},
    create: {
      name: "Hanna Worku",
      email: "hanna@propertyauction.et",
      passwordHash: await hashPassword("Buyer@1234"),
      role: "BUYER",
      roleId: buyerRole?.id,
      status: "ACTIVE",
      phone: "+251922334455",
      emailVerifiedAt: new Date(),
      buyerProfile: {
        create: {
          address: "Old Airport, Addis Ababa",
          preferredLocation: "Addis Ababa",
          isVerified: true,
        },
      },
    },
  });

  // Seller: Dawit Wolde (Prime Estate Holdings)
  const seller = await prisma.user.upsert({
    where: { email: "seller@propertyauction.et" },
    update: {},
    create: {
      name: "Dawit Wolde",
      email: "seller@propertyauction.et",
      passwordHash: await hashPassword("Seller@1234"),
      role: "SELLER",
      roleId: sellerRole?.id,
      status: "ACTIVE",
      phone: "+251912998877",
      emailVerifiedAt: new Date(),
      sellerProfile: {
        create: {
          nationalIdNumber: "ETH-NAT-890241",
          businessName: "Prime Estate Developers & Holdings LLC",
          taxId: "TIN-00984128",
          address: "Kazanchis Financial District, Kirkos, Addis Ababa",
          idDocumentUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
          status: "APPROVED",
          reviewedAt: new Date(),
        },
      },
    },
    include: { sellerProfile: true },
  });

  // Check if categories are fetched
  const catHomes = await prisma.category.findUnique({ where: { slug: "homes" } });
  const catCars = await prisma.category.findUnique({ where: { slug: "cars-vehicles" } });
  const catLand = await prisma.category.findUnique({ where: { slug: "land" } });
  const catCommercial = await prisma.category.findUnique({ where: { slug: "commercial" } });

  if (!catHomes || !catCars || !catLand || !catCommercial) return;

  // 6. Seed Featured Listings & Auctions matching the screenshot!
  const existingAuctionsCount = await prisma.auction.count();
  if (existingAuctionsCount === 0) {
    // 1. Modern Family House
    const listingHouse = await prisma.listing.create({
      data: {
        sellerId: seller.id,
        categoryId: catHomes.id,
        title: "Modern Family House",
        description: "Contemporary villa with 3 bedrooms, 2 bathrooms, modern open-concept kitchen, landscaped front garden, and paved private driveway. Situated in a quiet, gated community in Bole.",
        address: "Bole Subcity, Woreda 03",
        city: "Addis Ababa",
        region: "Bole",
        referenceNumber: "ETH-HOM-2026-001",
        features: ["3 Beds", "2 Baths", "250 m²", "Solar Heating", "Water Tank", "Security Post"],
        attributes: { propertyType: "House", bedrooms: 3, bathrooms: 2, buildingSizeSqm: 250, lotSizeSqm: 320, yearBuilt: 2022 },
        status: "APPROVED",
        images: {
          create: [
            { url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80", isPrimary: true, displayOrder: 1 },
            { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80", isPrimary: false, displayOrder: 2 },
          ],
        },
        documents: {
          create: [
            { title: "Authenticated Title Deed Certificate", documentType: "TITLE_DEED", fileUrl: "/docs/title-deed-house.pdf", isVerified: true },
          ],
        },
      },
    });

    const auctionHouse = await prisma.auction.create({
      data: {
        listingId: listingHouse.id,
        sellerId: seller.id,
        startingPrice: 280000,
        reservePrice: 310000,
        minBidIncrement: 5000,
        currentHighestBid: 320000,
        highestBidderId: getachew.id,
        startAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 52 * 60 * 60 * 1000), // Ends in 2d 4h 32m
        status: "ACTIVE",
        terms: "5% deposit required upon winning. Balance settled within 14 calendar days.",
      },
    });

    // Bids on Modern Family House
    await prisma.bid.create({
      data: { auctionId: auctionHouse.id, bidderId: hanna.id, amount: 290000, createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000) },
    });
    await prisma.bid.create({
      data: { auctionId: auctionHouse.id, bidderId: getachew.id, amount: 305000, createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000) },
    });
    await prisma.bid.create({
      data: { auctionId: auctionHouse.id, bidderId: hanna.id, amount: 315000, createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
    });
    await prisma.bid.create({
      data: { auctionId: auctionHouse.id, bidderId: getachew.id, amount: 320000, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    });

    // 2. Toyota Land Cruiser (2021)
    const listingCar = await prisma.listing.create({
      data: {
        sellerId: seller.id,
        categoryId: catCars.id,
        title: "Toyota Land Cruiser (2021)",
        description: "Immaculate Toyota Land Cruiser V8 Prado VX, 4WD, automatic transmission, full leather interior, sunroof, pearl white finish, meticulously dealer-serviced with authentic mileage records.",
        address: "Bole Medhanialem",
        city: "Addis Ababa",
        region: "Addis Ababa",
        referenceNumber: "ETH-CAR-2021-LC200",
        features: ["4WD", "65,000 km", "V8 Engine", "Leather Seats", "Sunroof", "Reverse Camera"],
        attributes: { make: "Toyota", model: "Land Cruiser", year: 2021, mileageKm: 65000, transmission: "Automatic", fuelType: "Diesel" },
        status: "APPROVED",
        images: {
          create: [
            { url: "https://images.unsplash.com/photo-1594502184342-2e12f877aa73?auto=format&fit=crop&w=1200&q=80", isPrimary: true, displayOrder: 1 },
          ],
        },
        documents: {
          create: [
            { title: "Vehicle Registration & Ownership Certificate (Libre)", documentType: "OWNERSHIP_CARD", fileUrl: "/docs/libre-lc.pdf", isVerified: true },
          ],
        },
      },
    });

    const auctionCar = await prisma.auction.create({
      data: {
        listingId: listingCar.id,
        sellerId: seller.id,
        startingPrice: 45000,
        reservePrice: 50000,
        minBidIncrement: 1000,
        currentHighestBid: 0,
        startAt: new Date(Date.now() + 84 * 60 * 60 * 1000), // Starts in 3d 12h
        endAt: new Date(Date.now() + 150 * 60 * 60 * 1000),
        status: "SCHEDULED",
        terms: "Full payment via bank transfer within 48 hours of auction closing.",
      },
    });

    // 3. Residential Land (1,000 m²)
    const listingLand = await prisma.listing.create({
      data: {
        sellerId: seller.id,
        categoryId: catLand.id,
        title: "Residential Land (1,000 m²)",
        description: "Prime residential plot zoned for upscale residential villa or multi-unit apartments. Ready water and 3-phase electricity infrastructure, flat topography, graded road frontage.",
        address: "Quiha Expansion Zone, Plot 42",
        city: "Mekelle",
        region: "Tigray",
        referenceNumber: "ETH-LND-2026-1000M",
        features: ["1,000 m²", "Clear Title", "Corner Plot", "Road Access", "Water Connected"],
        attributes: { plotSizeSqm: 1000, zoning: "Residential", titleType: "Freehold/Leasehold" },
        status: "APPROVED",
        images: {
          create: [
            { url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80", isPrimary: true, displayOrder: 1 },
          ],
        },
        documents: {
          create: [
            { title: "Cadastral Land Certificate & Masterplan", documentType: "TITLE_DEED", fileUrl: "/docs/land-cert.pdf", isVerified: true },
          ],
        },
      },
    });

    const auctionLand = await prisma.auction.create({
      data: {
        listingId: listingLand.id,
        sellerId: seller.id,
        startingPrice: 70000,
        reservePrice: 80000,
        minBidIncrement: 2000,
        currentHighestBid: 85000,
        highestBidderId: getachew.id,
        startAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 340 * 60 * 60 * 1000), // Ends in 14d 6h 15m
        status: "ACTIVE",
        terms: "10% earnest money deposit due upon auction conclusion.",
      },
    });

    await prisma.bid.create({
      data: { auctionId: auctionLand.id, bidderId: hanna.id, amount: 75000, createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000) },
    });
    await prisma.bid.create({
      data: { auctionId: auctionLand.id, bidderId: getachew.id, amount: 85000, createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000) },
    });

    // 4. Commercial Building
    const listingCommercial = await prisma.listing.create({
      data: {
        sellerId: seller.id,
        categoryId: catCommercial.id,
        title: "Commercial Building",
        description: "G+4 Modern commercial complex with ground-floor showroom, 12 partitioned office suites, basement parking for 15 vehicles, backup generator, and lift shaft.",
        address: "Kezira Commercial Hub, Boulevard 02",
        city: "Dire Dawa",
        region: "Dire Dawa",
        referenceNumber: "ETH-COM-2026-DIR",
        features: ["2,500 m²", "G+4 Structure", "Basement Parking", "Generator", "High Foot Traffic"],
        attributes: { buildingType: "Office", floorAreaSqm: 2500, floors: 5, yearBuilt: 2021 },
        status: "APPROVED",
        images: {
          create: [
            { url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80", isPrimary: true, displayOrder: 1 },
          ],
        },
        documents: {
          create: [
            { title: "Commercial Construction Certificate & Deed", documentType: "TITLE_DEED", fileUrl: "/docs/commercial-deed.pdf", isVerified: true },
          ],
        },
      },
    });

    const auctionCommercial = await prisma.auction.create({
      data: {
        listingId: listingCommercial.id,
        sellerId: seller.id,
        startingPrice: 1200000,
        reservePrice: 1400000,
        minBidIncrement: 25000,
        currentHighestBid: 0,
        startAt: new Date(Date.now() + 120 * 60 * 60 * 1000), // Starts in 5d 8h
        endAt: new Date(Date.now() + 240 * 60 * 60 * 1000),
        status: "SCHEDULED",
        terms: "Certified bank guarantee or bank escrow deposit required prior to bidding.",
      },
    });

    // 5. Watchlist for Getachew
    await prisma.watchlistItem.createMany({
      data: [
        { userId: getachew.id, auctionId: auctionHouse.id },
        { userId: getachew.id, auctionId: auctionCar.id },
        { userId: getachew.id, auctionId: auctionLand.id },
        { userId: getachew.id, auctionId: auctionCommercial.id },
      ],
      skipDuplicates: true,
    });

    // 6. Past Won Auction for Getachew
    const wonAuctionListing = await prisma.listing.create({
      data: {
        sellerId: seller.id,
        categoryId: catLand.id,
        title: "Prime Farmland Plot (5 Hectares)",
        description: "Irrigated fertile agricultural land with river frontage and access roads.",
        city: "Bishoftu",
        region: "Oromia",
        referenceNumber: "ETH-FARM-WON-01",
        features: ["5 Hectares", "Irrigation System", "River Access"],
        status: "APPROVED",
        images: {
          create: [
            { url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80", isPrimary: true },
          ],
        },
      },
    });

    const wonAuction = await prisma.auction.create({
      data: {
        listingId: wonAuctionListing.id,
        sellerId: seller.id,
        startingPrice: 4000,
        reservePrice: 4500,
        minBidIncrement: 100,
        currentHighestBid: 4850,
        highestBidderId: getachew.id,
        startAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: "COMPLETED",
      },
    });

    const resultWon = await prisma.auctionResult.create({
      data: {
        auctionId: wonAuction.id,
        winningBidderId: getachew.id,
        winningAmount: 4850,
        reserveMet: true,
        depositDue: 485,
        settlementDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        isSettled: true,
      },
    });

    await prisma.payment.create({
      data: {
        auctionResultId: resultWon.id,
        payerId: getachew.id,
        amount: 4850,
        currency: "USD",
        method: "BANK_TRANSFER",
        status: "PAID",
        transactionRef: "TX-ETH-2026-8831",
        notes: "Full settlement paid and confirmed for Farmland auction.",
        paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });

    // 7. Notifications for Getachew
    await prisma.notification.createMany({
      data: [
        {
          userId: getachew.id,
          type: "OUTBID",
          title: "You were outbid!",
          body: "Another bidder placed a bid of $42,000 on Toyota Land Cruiser.",
          link: `/buyer?tab=bids`,
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        },
        {
          userId: getachew.id,
          type: "AUCTION_WON",
          title: "Congratulations! You won an auction!",
          body: "You won Prime Farmland Plot with your winning bid of $4,850.",
          link: `/buyer?tab=won`,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
        {
          userId: getachew.id,
          type: "PAYMENT_CONFIRMED",
          title: "Payment Confirmed",
          body: "Payment for Commercial Building deposit of $1,150,000 has been verified.",
          link: `/buyer?tab=payments`,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      ],
    });

    // 8. Support / Complaint ticket
    await prisma.ticket.create({
      data: {
        number: "TK-10021",
        type: "COMPLAINT",
        subject: "Verification document delay inquiry",
        description: "I submitted title deed documents for verification yesterday, requesting status update on the review process.",
        status: "OPEN",
        priority: "NORMAL",
        createdById: getachew.id,
        auctionId: auctionHouse.id,
      },
    });
  }
}
