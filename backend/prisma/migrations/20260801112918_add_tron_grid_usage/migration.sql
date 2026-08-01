-- CreateTable
CREATE TABLE "TronGridUsage" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "quotaAlertSentAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TronGridUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TronGridUsage_date_key" ON "TronGridUsage"("date");

-- CreateIndex
CREATE INDEX "TronGridUsage_date_idx" ON "TronGridUsage"("date");
