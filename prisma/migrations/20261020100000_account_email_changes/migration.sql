ALTER TYPE "TokenType" ADD VALUE 'EMAIL_CHANGE';

ALTER TABLE "VerificationToken"
ADD COLUMN "pendingEmail" TEXT;

ALTER TABLE "User"
ADD COLUMN "googleOnly" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User" AS u
SET "googleOnly" = true
WHERE EXISTS (
  SELECT 1
  FROM "AuditLog" AS a
  WHERE a."actorId" = u."id"
    AND a."module" = 'AUTH'
    AND a."action" = 'USER_REGISTERED'
    AND a."newValue" ->> 'provider' = 'GOOGLE'
);
