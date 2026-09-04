-- CreateTable
CREATE TABLE "ZiiropayOperationCheck" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "expectedValue" TEXT,
    "checkAfter" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZiiropayOperationCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ZiiropayOperationCheck_resolvedAt_checkAfter_idx" ON "ZiiropayOperationCheck"("resolvedAt", "checkAfter");

-- CreateIndex
CREATE INDEX "ZiiropayOperationCheck_cardId_idx" ON "ZiiropayOperationCheck"("cardId");
