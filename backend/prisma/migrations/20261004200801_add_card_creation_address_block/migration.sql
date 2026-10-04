-- CreateTable
CREATE TABLE "CardCreationAddressBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountUsd" DECIMAL(18,2) NOT NULL,
    "context" TEXT NOT NULL,
    "oldCardId" TEXT,
    "emailSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardCreationAddressBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardCreationAddressBlock_userId_resolvedAt_idx" ON "CardCreationAddressBlock"("userId", "resolvedAt");

-- AddForeignKey
ALTER TABLE "CardCreationAddressBlock" ADD CONSTRAINT "CardCreationAddressBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
