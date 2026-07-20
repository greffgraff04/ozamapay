-- CreateEnum
CREATE TYPE "SweepStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');


-- CreateTable
CREATE TABLE "SweepTransaction" (
    "id" TEXT NOT NULL,
    "depositAddressId" TEXT NOT NULL,
    "amountUsdt" DECIMAL(18,6) NOT NULL,
    "txHash" TEXT,
    "gasFundingTxHash" TEXT,
    "status" "SweepStatus" NOT NULL DEFAULT 'PENDING',
    "sweptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SweepTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SweepTransaction_txHash_key" ON "SweepTransaction"("txHash");

-- CreateIndex
CREATE INDEX "SweepTransaction_depositAddressId_idx" ON "SweepTransaction"("depositAddressId");

-- CreateIndex
CREATE INDEX "SweepTransaction_status_idx" ON "SweepTransaction"("status");

-- AddForeignKey
ALTER TABLE "SweepTransaction" ADD CONSTRAINT "SweepTransaction_depositAddressId_fkey" FOREIGN KEY ("depositAddressId") REFERENCES "DepositAddress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

