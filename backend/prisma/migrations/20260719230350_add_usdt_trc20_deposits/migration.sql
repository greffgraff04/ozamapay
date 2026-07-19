-- CreateEnum
CREATE TYPE "CryptoDepositStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CREDITED', 'FAILED');


-- CreateTable
CREATE TABLE "DepositAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "derivationIndex" SERIAL NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'TRC20',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepositAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoDeposit" (
    "id" TEXT NOT NULL,
    "depositAddressId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "amountUsdt" DECIMAL(18,6) NOT NULL,
    "status" "CryptoDepositStatus" NOT NULL DEFAULT 'PENDING',
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "transactionId" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creditedAt" TIMESTAMP(3),

    CONSTRAINT "CryptoDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DepositAddress_userId_key" ON "DepositAddress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DepositAddress_address_key" ON "DepositAddress"("address");

-- CreateIndex
CREATE UNIQUE INDEX "DepositAddress_derivationIndex_key" ON "DepositAddress"("derivationIndex");

-- CreateIndex
CREATE INDEX "DepositAddress_userId_idx" ON "DepositAddress"("userId");

-- CreateIndex
CREATE INDEX "DepositAddress_address_idx" ON "DepositAddress"("address");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoDeposit_txHash_key" ON "CryptoDeposit"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoDeposit_transactionId_key" ON "CryptoDeposit"("transactionId");

-- CreateIndex
CREATE INDEX "CryptoDeposit_depositAddressId_idx" ON "CryptoDeposit"("depositAddressId");

-- CreateIndex
CREATE INDEX "CryptoDeposit_status_idx" ON "CryptoDeposit"("status");

-- AddForeignKey
ALTER TABLE "DepositAddress" ADD CONSTRAINT "DepositAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoDeposit" ADD CONSTRAINT "CryptoDeposit_depositAddressId_fkey" FOREIGN KEY ("depositAddressId") REFERENCES "DepositAddress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoDeposit" ADD CONSTRAINT "CryptoDeposit_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

