-- AlterEnum
ALTER TYPE "CardStatus" ADD VALUE 'REPLACED';
ALTER TYPE "CardStatus" ADD VALUE 'PENDING_RECHARGE';

-- AlterTable
ALTER TABLE "VirtualCard" ADD COLUMN     "balanceAtTermination" DECIMAL(18,2),
ADD COLUMN     "pendingShortfallHtg" DECIMAL(18,2),
ADD COLUMN     "replacedByCardId" TEXT,
ADD COLUMN     "terminatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StrowalletWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrowalletWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StrowalletWebhookEvent_eventId_key" ON "StrowalletWebhookEvent"("eventId");
