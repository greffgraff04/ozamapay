-- CreateEnum
CREATE TYPE "LiquidityMethod" AS ENUM ('MONCASH', 'ZELLE', 'CASH', 'BANK');

-- CreateEnum
CREATE TYPE "LiquidityRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "LiquidityRequest" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "method" "LiquidityMethod" NOT NULL,
    "accountInfo" TEXT NOT NULL,
    "status" "LiquidityRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiquidityRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiquidityRequest_agentId_idx" ON "LiquidityRequest"("agentId");

-- CreateIndex
CREATE INDEX "LiquidityRequest_status_idx" ON "LiquidityRequest"("status");

-- AddForeignKey
ALTER TABLE "LiquidityRequest" ADD CONSTRAINT "LiquidityRequest_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
