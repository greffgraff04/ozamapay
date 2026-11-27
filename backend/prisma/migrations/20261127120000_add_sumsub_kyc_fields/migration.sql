-- Sumsub KYC integration (behind SUMSUB_ENABLED). Additive columns only.
-- Does not touch existing KYC data or the existing manual KYC flow.

-- User: Sumsub correlation + idempotence marker
ALTER TABLE "User" ADD COLUMN "sumsubApplicantId" TEXT;
ALTER TABLE "User" ADD COLUMN "sumsubLevelName" TEXT;
ALTER TABLE "User" ADD COLUMN "sumsubReviewStatus" TEXT;

-- Kyc: rejection details when reviewAnswer = RED
ALTER TABLE "Kyc" ADD COLUMN "sumsubReviewRejectType" TEXT;
ALTER TABLE "Kyc" ADD COLUMN "sumsubRejectLabels" TEXT[] NOT NULL DEFAULT '{}';
