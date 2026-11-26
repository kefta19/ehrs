CREATE TYPE "AuctionType" AS ENUM ('FORWARD', 'REVERSE');
CREATE TYPE "WinnerReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED');

ALTER TABLE "Auction"
ADD COLUMN "type" "AuctionType" NOT NULL DEFAULT 'FORWARD',
ADD COLUMN "extensionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Auction"
ADD CONSTRAINT "Auction_extensionCount_range"
CHECK ("extensionCount" BETWEEN 0 AND 10);

ALTER TABLE "AuctionResult"
ADD COLUMN "winnerReviewStatus" "WinnerReviewStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "winnerReviewedAt" TIMESTAMP(3),
ADD COLUMN "winnerReviewedById" TEXT;

CREATE TABLE "AuctionExtension" (
  "id" TEXT NOT NULL,
  "auctionId" TEXT NOT NULL,
  "bidId" TEXT NOT NULL,
  "previousEndAt" TIMESTAMP(3) NOT NULL,
  "newEndAt" TIMESTAMP(3) NOT NULL,
  "extensionNo" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuctionExtension_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuctionExtension_auctionId_extensionNo_key"
ON "AuctionExtension"("auctionId", "extensionNo");
CREATE INDEX "AuctionExtension_auctionId_createdAt_idx"
ON "AuctionExtension"("auctionId", "createdAt");
ALTER TABLE "AuctionExtension"
ADD CONSTRAINT "AuctionExtension_extensionNo_range"
CHECK ("extensionNo" BETWEEN 1 AND 10),
ADD CONSTRAINT "AuctionExtension_five_minute_increment"
CHECK ("newEndAt" = "previousEndAt" + INTERVAL '5 minutes');

ALTER TABLE "AuctionExtension"
ADD CONSTRAINT "AuctionExtension_auctionId_fkey"
FOREIGN KEY ("auctionId") REFERENCES "Auction"("id")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "AuctionExtension_bidId_fkey"
FOREIGN KEY ("bidId") REFERENCES "Bid"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuctionResult"
ADD CONSTRAINT "AuctionResult_winnerReviewedById_fkey"
FOREIGN KEY ("winnerReviewedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
