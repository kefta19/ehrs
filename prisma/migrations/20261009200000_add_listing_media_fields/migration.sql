-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'ID_DOCUMENT', 'OWNERSHIP_DOCUMENT');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "biometricVerificationId" TEXT,
ADD COLUMN "idDocumentMediaId" TEXT,
ADD COLUMN "ownerNationalId" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "videoUrl" TEXT;

-- CreateTable
CREATE TABLE "BiometricVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'DEVICE_BIOMETRIC',
    "credentialId" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BiometricVerification_userId_idx" ON "BiometricVerification"("userId");

-- CreateIndex
CREATE INDEX "Media_userId_kind_idx" ON "Media"("userId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_biometricVerificationId_key" ON "Listing"("biometricVerificationId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_biometricVerificationId_fkey" FOREIGN KEY ("biometricVerificationId") REFERENCES "BiometricVerification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricVerification" ADD CONSTRAINT "BiometricVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
