-- C2: Add missing indexes on Transaction for wallet-based queries and time-based sorting
CREATE INDEX IF NOT EXISTS "Transaction_senderWalletId_idx" ON "Transaction"("senderWalletId");
CREATE INDEX IF NOT EXISTS "Transaction_receiverWalletId_idx" ON "Transaction"("receiverWalletId");
CREATE INDEX IF NOT EXISTS "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- C4: Add strowalletCustomerId to User to prevent duplicate Strowallet customer creation
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "strowalletCustomerId" TEXT;
