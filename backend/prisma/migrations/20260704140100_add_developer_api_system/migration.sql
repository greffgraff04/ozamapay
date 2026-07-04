-- CreateEnum
CREATE TYPE "ApiKeyMode" AS ENUM ('LIVE', 'TEST');

-- CreateEnum
CREATE TYPE "ApiKeyPermission" AS ENUM ('READ', 'WRITE', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "ApiPaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "testWalletBalance" DECIMAL(18,2) NOT NULL DEFAULT 1000000.00;

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "mode" "ApiKeyMode" NOT NULL,
    "permissions" "ApiKeyPermission"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "secret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiPayment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'HTG',
    "fee" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "status" "ApiPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payerUserId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestTransaction" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "fee" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "status" "ApiPaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_businessId_idx" ON "ApiKey"("businessId");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_businessId_idx" ON "WebhookEndpoint"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiPayment_reference_key" ON "ApiPayment"("reference");

-- CreateIndex
CREATE INDEX "ApiPayment_businessId_idx" ON "ApiPayment"("businessId");

-- CreateIndex
CREATE INDEX "ApiPayment_status_idx" ON "ApiPayment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TestTransaction_reference_key" ON "TestTransaction"("reference");

-- CreateIndex
CREATE INDEX "TestTransaction_businessId_idx" ON "TestTransaction"("businessId");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiPayment" ADD CONSTRAINT "ApiPayment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiPayment" ADD CONSTRAINT "ApiPayment_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestTransaction" ADD CONSTRAINT "TestTransaction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestTransaction" ADD CONSTRAINT "TestTransaction_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
