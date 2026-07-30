-- CreateEnum
CREATE TYPE "CardTransactionType" AS ENUM ('AUTHORIZATION', 'TOPUP');

-- CreateTable
CREATE TABLE "CardTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "CardTransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT,
    "status" TEXT NOT NULL,
    "merchant" TEXT,
    "narrative" TEXT,
    "mcc" TEXT,
    "country" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardTransaction_reference_key" ON "CardTransaction"("reference");

-- CreateIndex
CREATE INDEX "CardTransaction_userId_idx" ON "CardTransaction"("userId");

-- CreateIndex
CREATE INDEX "CardTransaction_cardId_idx" ON "CardTransaction"("cardId");

-- CreateIndex
CREATE INDEX "CardTransaction_occurredAt_idx" ON "CardTransaction"("occurredAt");

-- AddForeignKey
ALTER TABLE "CardTransaction" ADD CONSTRAINT "CardTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
