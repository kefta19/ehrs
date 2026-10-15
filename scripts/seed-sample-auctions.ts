import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const hashPassword = (password: string) => bcrypt.hash(password, 12);

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding sample auctions...\n');
  
  try {
    // Get or create default tenant
    const defaultTenant = await prisma.tenant.findFirst({
      where: { isDefault: true, isActive: true },
    });
    
    if (!defaultTenant) {
      throw new Error('Default tenant not found. Run seed-database.ts first.');
    }

    // Get or create roles
    const sellerRole = await prisma.role.findFirst({
      where: { name: 'SELLER' },
    });
    
    const buyerRole = await prisma.role.findFirst({
      where: { name: 'BUYER' },
    });

    if (!sellerRole || !buyerRole) {
      throw new Error('Roles not found. Run seed-database.ts first.');
    }

    // Create sample seller
    const seller = await prisma.user.upsert({
      where: { email: 'seller@example.com' },
      update: {},
      create: {
        name: 'Sample Seller',
        email: 'seller@example.com',
        passwordHash: await hashPassword('Seller@123'),
        role: 'SELLER',
        roleId: sellerRole.id,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        tenantId: defaultTenant.id,
        sellerProfile: {
          create: {
            nationalIdNumber: 'ETH-123456',
            businessName: 'Sample Business',
            taxId: 'TIN-123456',
            address: 'Addis Ababa, Ethiopia',
            status: 'APPROVED',
            reviewedAt: new Date(),
          },
        },
      },
    });

    // Create sample buyer
    const buyer = await prisma.user.upsert({
      where: { email: 'buyer@example.com' },
      update: {},
      create: {
        name: 'Sample Buyer',
        email: 'buyer@example.com',
        passwordHash: await hashPassword('Buyer@123'),
        role: 'BUYER',
        roleId: buyerRole.id,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        tenantId: defaultTenant.id,
        buyerProfile: {
          create: {
            address: 'Addis Ababa, Ethiopia',
            isVerified: true,
          },
        },
      },
    });

    // Get or create categories
    const catHomes = await prisma.category.upsert({
      where: { slug: 'homes' },
      update: {},
      create: {
        slug: 'homes',
        name: 'Homes',
        icon: 'home',
        sortOrder: 1,
        isActive: true,
      },
    });

    const catCars = await prisma.category.upsert({
      where: { slug: 'cars-vehicles' },
      update: {},
      create: {
        slug: 'cars-vehicles',
        name: 'Cars & Vehicles',
        icon: 'car',
        sortOrder: 2,
        isActive: true,
      },
    });

    // Create LIVE auction (Active now)
    const liveListing = await prisma.listing.upsert({
      where: { referenceNumber: 'LIVE-001' },
      update: {},
      create: {
        sellerId: seller.id,
        categoryId: catHomes.id,
        title: 'Modern Villa - Live Auction',
        description: 'Beautiful modern villa with 4 bedrooms, 3 bathrooms, and a garden.',
        city: 'Addis Ababa',
        region: 'Bole',
        referenceNumber: 'LIVE-001',
        status: 'APPROVED',
        tenantId: defaultTenant.id,
        images: {
          create: [
            {
              url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
              isPrimary: true,
              displayOrder: 1,
            },
          ],
        },
      },
    });

    // Check if auction already exists for this listing
    const existingLiveAuction = await prisma.auction.findFirst({
      where: { listingId: liveListing.id },
    });

    const liveAuction = existingLiveAuction || await prisma.auction.create({
      data: {
        listingId: liveListing.id,
        sellerId: seller.id,
        startingPrice: 500000,
        reservePrice: 550000,
        minBidIncrement: 10000,
        currentHighestBid: 520000,
        highestBidderId: buyer.id,
        startAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        terms: '5% deposit required upon winning.',
      },
    });

    // Create sample bid for live auction
    await prisma.bid.upsert({
      where: { id: 'bid-live-001' },
      update: {},
      create: {
        id: 'bid-live-001',
        auctionId: liveAuction.id,
        bidderId: buyer.id,
        amount: 520000,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
    });

    // Create UPCOMING auction (Scheduled)
    const upcomingListing = await prisma.listing.upsert({
      where: { referenceNumber: 'UPCOMING-001' },
      update: {},
      create: {
        sellerId: seller.id,
        categoryId: catCars.id,
        title: 'Toyota Land Cruiser - Upcoming',
        description: '2021 Toyota Land Cruiser in excellent condition.',
        city: 'Addis Ababa',
        region: 'Kazanchis',
        referenceNumber: 'UPCOMING-001',
        status: 'APPROVED',
        tenantId: defaultTenant.id,
        images: {
          create: [
            {
              url: 'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?auto=format&fit=crop&w=1200&q=80',
              isPrimary: true,
              displayOrder: 1,
            },
          ],
        },
      },
    });

    // Check if auction already exists for this listing
    const existingUpcomingAuction = await prisma.auction.findFirst({
      where: { listingId: upcomingListing.id },
    });

    const upcomingAuction = existingUpcomingAuction || await prisma.auction.create({
      data: {
        listingId: upcomingListing.id,
        sellerId: seller.id,
        startingPrice: 80000,
        reservePrice: 90000,
        minBidIncrement: 2000,
        currentHighestBid: 0,
        startAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'SCHEDULED',
        terms: 'Full payment within 48 hours.',
      },
    });

    console.log('\n✅ Sample auctions created successfully!');
    console.log('\nLive Auction:');
    console.log(`  - ${liveListing.title}`);
    console.log(`  - Current Bid: $${liveAuction.currentHighestBid.toLocaleString()}`);
    console.log(`  - Ends in: 24 hours`);
    
    console.log('\nUpcoming Auction:');
    console.log(`  - ${upcomingListing.title}`);
    console.log(`  - Starting Price: $${upcomingAuction.startingPrice.toLocaleString()}`);
    console.log(`  - Starts in: 3 days`);
    
    console.log('\nTest Accounts:');
    console.log(`  Seller: seller@example.com / Seller@123`);
    console.log(`  Buyer: buyer@example.com / Buyer@123`);
    
  } catch (error) {
    console.error('❌ Error seeding sample auctions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
