-- CreateTable
CREATE TABLE "CardCreationFailure" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardCreationFailure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardCreationFailure_userId_idx" ON "CardCreationFailure"("userId");

-- CreateIndex
CREATE INDEX "CardCreationFailure_createdAt_idx" ON "CardCreationFailure"("createdAt");

-- AddForeignKey
ALTER TABLE "CardCreationFailure" ADD CONSTRAINT "CardCreationFailure_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
