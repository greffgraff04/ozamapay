-- Remove unique constraint on VirtualCard.userId to allow multiple cards per user
DROP INDEX "VirtualCard_userId_key";
