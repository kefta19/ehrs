CREATE TYPE "EntryFeeStatus" AS ENUM (
  'UNPAID',
  'PENDING',
  'CONFIRMED',
  'FAILED',
  'SUPERSEDED',
  'WAIVED'
);

ALTER TABLE "Listing"
ADD COLUMN "tenantId" TEXT,
ADD COLUMN "ownershipDocumentMediaId" TEXT;

ALTER TABLE "Auction"
ADD COLUMN "tenantId" TEXT,
ADD COLUMN "entryFeeStatus" "EntryFeeStatus" NOT NULL DEFAULT 'UNPAID';

UPDATE "Listing" AS listing
SET "tenantId" = seller."tenantId"
FROM "User" AS seller
WHERE listing."sellerId" = seller."id";

UPDATE "Auction" AS auction
SET "tenantId" = seller."tenantId"
FROM "User" AS seller
WHERE auction."sellerId" = seller."id";

UPDATE "Auction"
SET "entryFeeStatus" = 'WAIVED'
WHERE "createdAt" < CURRENT_TIMESTAMP;

CREATE TABLE "AuctionEntryFee" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "auctionId" TEXT NOT NULL,
  "payerId" TEXT NOT NULL,
  "basisAmount" DECIMAL(14,2) NOT NULL,
  "ratePercent" DECIMAL(5,2) NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ETB',
  "status" "EntryFeeStatus" NOT NULL DEFAULT 'UNPAID',
  "method" TEXT,
  "txRef" TEXT NOT NULL,
  "providerRef" TEXT,
  "bankReference" TEXT,
  "failureReason" TEXT,
  "verifiedById" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuctionEntryFee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "txRef" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuctionEntryFee_txRef_key" ON "AuctionEntryFee"("txRef");
CREATE UNIQUE INDEX "AuctionEntryFee_bankReference_key" ON "AuctionEntryFee"("bankReference");
CREATE INDEX "AuctionEntryFee_tenantId_status_idx" ON "AuctionEntryFee"("tenantId", "status");
CREATE INDEX "AuctionEntryFee_auctionId_createdAt_idx" ON "AuctionEntryFee"("auctionId", "createdAt");
CREATE INDEX "AuctionEntryFee_payerId_status_idx" ON "AuctionEntryFee"("payerId", "status");
CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_eventKey_key" ON "PaymentWebhookEvent"("provider", "eventKey");
CREATE INDEX "PaymentWebhookEvent_txRef_idx" ON "PaymentWebhookEvent"("txRef");
CREATE INDEX "Listing_tenantId_status_idx" ON "Listing"("tenantId", "status");
CREATE INDEX "Auction_tenantId_status_idx" ON "Auction"("tenantId", "status");

ALTER TABLE "Listing"
ADD CONSTRAINT "Listing_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Auction"
ADD CONSTRAINT "Auction_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuctionEntryFee"
ADD CONSTRAINT "AuctionEntryFee_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "AuctionEntryFee_auctionId_fkey"
FOREIGN KEY ("auctionId") REFERENCES "Auction"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "AuctionEntryFee_payerId_fkey"
FOREIGN KEY ("payerId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
