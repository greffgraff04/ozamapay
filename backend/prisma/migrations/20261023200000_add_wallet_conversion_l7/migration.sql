-- L7 — Conversion de devises wallet (HTG <-> USD <-> EUR). Migration 100%
-- additive : aucune colonne existante n'est renommée, retirée ni rendue
-- obligatoire. Wallet.balance (HTG) reste intact et seule source de vérité
-- pour tous les flux existants.

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'CONVERSION';

-- AlterTable (nullable, NULL = HTG implicite — aucune ligne existante affectée)
ALTER TABLE "Transaction" ADD COLUMN "currency" TEXT;
ALTER TABLE "LedgerEntry" ADD COLUMN "currency" TEXT;

-- CreateTable
CREATE TABLE "WalletCurrencyBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletCurrencyBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletCurrencyBalance_userId_currency_key" ON "WalletCurrencyBalance"("userId", "currency");

-- CreateIndex
CREATE INDEX "WalletCurrencyBalance_userId_idx" ON "WalletCurrencyBalance"("userId");

-- AddForeignKey
ALTER TABLE "WalletCurrencyBalance" ADD CONSTRAINT "WalletCurrencyBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ConversionQuote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "feePercent" DECIMAL(6,4) NOT NULL,
    "feeAmount" DECIMAL(18,2) NOT NULL,
    "finalAmount" DECIMAL(18,2) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversionQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversionQuote_userId_idx" ON "ConversionQuote"("userId");

-- CreateIndex
CREATE INDEX "ConversionQuote_expiresAt_idx" ON "ConversionQuote"("expiresAt");

-- AddForeignKey
ALTER TABLE "ConversionQuote" ADD CONSTRAINT "ConversionQuote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
