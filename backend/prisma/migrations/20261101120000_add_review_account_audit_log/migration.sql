-- Compte démo App Store/Google Play review — table additive, aucune colonne
-- existante touchée. userId nullable car OtpService résout l'identité avant
-- qu'un token/session existe (send/verify).

-- CreateTable
CREATE TABLE "ReviewAccountAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewAccountAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewAccountAuditLog_userId_idx" ON "ReviewAccountAuditLog"("userId");

-- CreateIndex
CREATE INDEX "ReviewAccountAuditLog_email_idx" ON "ReviewAccountAuditLog"("email");

-- CreateIndex
CREATE INDEX "ReviewAccountAuditLog_createdAt_idx" ON "ReviewAccountAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "ReviewAccountAuditLog" ADD CONSTRAINT "ReviewAccountAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
