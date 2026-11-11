-- Additif, nullable — pa touche okenn done ki la deja. Chan sa a sove yon
-- rezime kont (lis blanch status/message/reason/comment/rejectLabels/
-- rejectReasons/error/errors) soti nan repons cardkyc/cardkycstatus founisè
-- a, pou ekip sipò ka wè yon rezon san bezwen dashboard founisè a. JAMAIS
-- completion_link/kyc_id/reference/kle/sekrè.

-- AlterTable
ALTER TABLE "CardCreationFailure" ADD COLUMN "providerReason" TEXT;
