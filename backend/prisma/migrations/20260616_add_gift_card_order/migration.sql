-- CreateTable
CREATE TABLE IF NOT EXISTS "GiftCardOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "htgPaid" DECIMAL(18,2) NOT NULL,
    "redeemCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GiftCardOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GiftCardOrder_userId_idx" ON "GiftCardOrder"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GiftCardOrder_status_idx" ON "GiftCardOrder"("status");

-- AddForeignKey
ALTER TABLE "GiftCardOrder" ADD CONSTRAINT "GiftCardOrder_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
