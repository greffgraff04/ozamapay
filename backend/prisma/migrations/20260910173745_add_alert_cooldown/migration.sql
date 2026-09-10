-- CreateTable
CREATE TABLE "AlertCooldown" (
    "key" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertCooldown_pkey" PRIMARY KEY ("key")
);
