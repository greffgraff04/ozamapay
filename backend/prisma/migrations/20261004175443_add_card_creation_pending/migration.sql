-- CreateTable
CREATE TABLE "CardCreationPending" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountUsd" DECIMAL(18,2) NOT NULL,
    "context" TEXT NOT NULL,
    "totalHtg" DECIMAL(18,2),
    "oldCardId" TEXT,
    "feeDeductedHtg" DECIMAL(18,2),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "adminAlertSentAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardCreationPending_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardCreationPending_resolvedAt_idx" ON "CardCreationPending"("resolvedAt");

-- CreateIndex
CREATE INDEX "CardCreationPending_userId_idx" ON "CardCreationPending"("userId");

-- AddForeignKey
ALTER TABLE "CardCreationPending" ADD CONSTRAINT "CardCreationPending_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
