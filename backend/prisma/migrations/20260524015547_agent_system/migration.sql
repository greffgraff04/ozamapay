/*
  Warnings:

  - The `status` column on the `Kyc` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `value` on the `Rate` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,4)`.
  - A unique constraint covering the columns `[agentCode]` on the table `Agent` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `agentCode` to the `Agent` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AgentLevel" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'BLACK');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('TOPUP', 'WITHDRAWAL', 'KYC');

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "agentCode" TEXT NOT NULL,
ADD COLUMN     "level" "AgentLevel" NOT NULL DEFAULT 'BRONZE',
ADD COLUMN     "totalCommission" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "totalKyc" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalTopupVolume" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "totalWithdrawalVolume" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "trustScore" DECIMAL(5,2) NOT NULL DEFAULT 100.00;

-- AlterTable
ALTER TABLE "Kyc" ADD COLUMN     "agentId" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "KYCStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Rate" ALTER COLUMN "value" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "TopUpRequest" ADD COLUMN     "agentId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referredByAgentId" TEXT;

-- AlterTable
ALTER TABLE "WithdrawalRequest" ADD COLUMN     "agentId" TEXT;

-- DropEnum
DROP TYPE "KycStatus";

-- CreateTable
CREATE TABLE "AgentWallet" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "transactionId" TEXT,
    "type" "CommissionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentWallet_agentId_key" ON "AgentWallet"("agentId");

-- CreateIndex
CREATE INDEX "Commission_agentId_idx" ON "Commission"("agentId");

-- CreateIndex
CREATE INDEX "Commission_transactionId_idx" ON "Commission"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_agentCode_key" ON "Agent"("agentCode");

-- CreateIndex
CREATE INDEX "Kyc_agentId_idx" ON "Kyc"("agentId");

-- CreateIndex
CREATE INDEX "TopUpRequest_agentId_idx" ON "TopUpRequest"("agentId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_agentId_idx" ON "WithdrawalRequest"("agentId");

-- AddForeignKey
ALTER TABLE "TopUpRequest" ADD CONSTRAINT "TopUpRequest_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kyc" ADD CONSTRAINT "Kyc_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentWallet" ADD CONSTRAINT "AgentWallet_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
