-- Additif, nullable — pa touche okenn done ki la deja. Sign in with Apple
-- (Apple guideline 4.8). appleUserId = Apple `sub`, jamè chanje pou yon
-- kont done. appleRefreshTokenEncrypted estoke chifre (AES-256-GCM, wè
-- apple-token.util.ts) — sèlman si revokasyon Apple konfigire. Google
-- mobil reyitilize "googleId" ki egziste deja, pa gen nouvo chan pou li.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "appleUserId" TEXT;
ALTER TABLE "User" ADD COLUMN "appleRefreshTokenEncrypted" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_appleUserId_key" ON "User"("appleUserId");
