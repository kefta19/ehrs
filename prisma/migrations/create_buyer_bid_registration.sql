DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BuyerRegistrationStatus') THEN
    CREATE TYPE "BuyerRegistrationStatus" AS ENUM ('PENDING', 'PAID', 'WAIVED', 'REJECTED');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "BuyerBidRegistration" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "status" "BuyerRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "feeAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "txRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyerBidRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BuyerBidRegistration_txRef_key" ON "BuyerBidRegistration"("txRef");
CREATE UNIQUE INDEX IF NOT EXISTS "BuyerBidRegistration_auctionId_buyerId_key" ON "BuyerBidRegistration"("auctionId", "buyerId");
CREATE INDEX IF NOT EXISTS "BuyerBidRegistration_auctionId_status_idx" ON "BuyerBidRegistration"("auctionId", "status");
CREATE INDEX IF NOT EXISTS "BuyerBidRegistration_buyerId_status_idx" ON "BuyerBidRegistration"("buyerId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'BuyerBidRegistration_auctionId_fkey'
  ) THEN
    ALTER TABLE "BuyerBidRegistration" ADD CONSTRAINT "BuyerBidRegistration_auctionId_fkey"
      FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'BuyerBidRegistration_buyerId_fkey'
  ) THEN
    ALTER TABLE "BuyerBidRegistration" ADD CONSTRAINT "BuyerBidRegistration_buyerId_fkey"
      FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;
