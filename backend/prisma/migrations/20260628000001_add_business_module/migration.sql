-- ── New enums ──────────────────────────────────────────────────────────────

CREATE TYPE "BusinessTier" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');
CREATE TYPE "BusinessApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "BusinessMemberRole" AS ENUM ('OWNER', 'ACCOUNTANT', 'CASHIER');
CREATE TYPE "BusinessTransactionType" AS ENUM ('PAYMENT_RECEIVED', 'WITHDRAWAL', 'TRANSFER_OUT', 'TOPUP');

-- ── Tables that were pushed via db push but never migrated ─────────────────

CREATE TABLE IF NOT EXISTS "AdminInvitation" (
    "id"        TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "role"      "UserRole" NOT NULL,
    "token"     TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "accepted"  BOOLEAN NOT NULL DEFAULT false,
    "invitedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AdminInvitation_email_key" ON "AdminInvitation"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "AdminInvitation_token_key" ON "AdminInvitation"("token");
CREATE INDEX IF NOT EXISTS "AdminInvitation_token_idx" ON "AdminInvitation"("token");
CREATE INDEX IF NOT EXISTS "AdminInvitation_email_idx" ON "AdminInvitation"("email");

CREATE TABLE IF NOT EXISTS "DailyAccessCode" (
    "id"          TEXT NOT NULL,
    "code"        TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"   TIMESTAMP(3) NOT NULL,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "DailyAccessCode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DailyAccessCode_isActive_idx" ON "DailyAccessCode"("isActive");

CREATE TABLE IF NOT EXISTS "AdminSession" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "loginAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt"  TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AdminSession_userId_idx" ON "AdminSession"("userId");
CREATE INDEX IF NOT EXISTS "AdminSession_isActive_idx" ON "AdminSession"("isActive");
ALTER TABLE "AdminSession"
  ADD CONSTRAINT "AdminSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add columns to User that were pushed but not in migration history
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "subscriptionTier"    TEXT NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS "subscriptionExpiry"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "loginLockedUntil"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "adminInvitationToken" TEXT,
  ADD COLUMN IF NOT EXISTS "adminSetupComplete"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "googleId"            TEXT,
  ADD COLUMN IF NOT EXISTS "photoUrl"            TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");

ALTER TABLE "VirtualCard"
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'STROWALLET_NFC';
ALTER TABLE "VirtualCard"
  ALTER COLUMN "cardName" DROP NOT NULL,
  ALTER COLUMN "last4"    DROP NOT NULL,
  ALTER COLUMN "expiry"   DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "AirtimeOrder" (
    "id"            TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "operatorId"    INTEGER NOT NULL,
    "operatorName"  TEXT NOT NULL,
    "amount"        DECIMAL(18,2) NOT NULL,
    "htgPaid"       DECIMAL(18,2) NOT NULL,
    "phoneNumber"   TEXT NOT NULL,
    "status"        TEXT NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AirtimeOrder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AirtimeOrder_userId_idx" ON "AirtimeOrder"("userId");
CREATE INDEX IF NOT EXISTS "AirtimeOrder_status_idx" ON "AirtimeOrder"("status");
ALTER TABLE "AirtimeOrder"
  ADD CONSTRAINT "AirtimeOrder_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add NATCASH to ServiceType if not present
DO $$ BEGIN
  ALTER TYPE "ServiceType" ADD VALUE IF NOT EXISTS 'NATCASH';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── MerchantApplication (new — was never migrated) ────────────────────────

CREATE TABLE "MerchantApplication" (
    "id"           TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "email"        TEXT NOT NULL,
    "phone"        TEXT NOT NULL,
    "address"      TEXT NOT NULL,
    "plan"         TEXT NOT NULL DEFAULT 'STARTER',
    "tier"         "BusinessTier" NOT NULL DEFAULT 'STARTER',
    "status"       "BusinessApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "userId"       TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MerchantApplication_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "MerchantApplication"
  ADD CONSTRAINT "MerchantApplication_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── New Business module tables ────────────────────────────────────────────

CREATE TABLE "Business" (
    "id"            TEXT NOT NULL,
    "businessName"  TEXT NOT NULL,
    "category"      TEXT NOT NULL,
    "tier"          "BusinessTier" NOT NULL,
    "status"        "BusinessApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "ownerId"       TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Business_applicationId_key" ON "Business"("applicationId");
CREATE INDEX "Business_ownerId_idx" ON "Business"("ownerId");
CREATE INDEX "Business_status_idx" ON "Business"("status");
ALTER TABLE "Business"
  ADD CONSTRAINT "Business_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Business"
  ADD CONSTRAINT "Business_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "MerchantApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BusinessWallet" (
    "id"         TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "balance"    DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "currency"   TEXT NOT NULL DEFAULT 'HTG',
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessWallet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BusinessWallet_businessId_key" ON "BusinessWallet"("businessId");
ALTER TABLE "BusinessWallet"
  ADD CONSTRAINT "BusinessWallet_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BusinessMember" (
    "id"         TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "role"       "BusinessMemberRole" NOT NULL,
    "invitedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BusinessMember_businessId_userId_key" ON "BusinessMember"("businessId", "userId");
CREATE INDEX "BusinessMember_businessId_idx" ON "BusinessMember"("businessId");
CREATE INDEX "BusinessMember_userId_idx" ON "BusinessMember"("userId");
ALTER TABLE "BusinessMember"
  ADD CONSTRAINT "BusinessMember_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusinessMember"
  ADD CONSTRAINT "BusinessMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BusinessTransaction" (
    "id"               TEXT NOT NULL,
    "businessWalletId" TEXT NOT NULL,
    "type"             "BusinessTransactionType" NOT NULL,
    "amount"           DECIMAL(18,2) NOT NULL,
    "fee"              DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "netAmount"        DECIMAL(18,2) NOT NULL,
    "reference"        TEXT NOT NULL,
    "status"           "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "payerUserId"      TEXT,
    "description"      TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessTransaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BusinessTransaction_reference_key" ON "BusinessTransaction"("reference");
CREATE INDEX "BusinessTransaction_businessWalletId_idx" ON "BusinessTransaction"("businessWalletId");
CREATE INDEX "BusinessTransaction_status_idx" ON "BusinessTransaction"("status");
CREATE INDEX "BusinessTransaction_createdAt_idx" ON "BusinessTransaction"("createdAt");
ALTER TABLE "BusinessTransaction"
  ADD CONSTRAINT "BusinessTransaction_businessWalletId_fkey"
  FOREIGN KEY ("businessWalletId") REFERENCES "BusinessWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusinessTransaction"
  ADD CONSTRAINT "BusinessTransaction_payerUserId_fkey"
  FOREIGN KEY ("payerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
