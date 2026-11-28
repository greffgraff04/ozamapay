-- AlterTable
ALTER TABLE "VirtualCard" ADD COLUMN     "isFounderFreeCard" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Commission" ADD COLUMN     "userId" TEXT;

-- CreateIndex
-- Index inik pasyèl: yon sèl commission FIRST_CARD pa itilizatè (userId), men
-- plizyè komisyon TOPUP/WITHDRAWAL/KYC (userId rete NULL pou sa yo) pa gen pwoblèm
-- paske Postgres pa konsidere plizyè NULL kòm doublon nan yon index inik.
-- 'FIRST_CARD' disponib isit la paske li te ajoute nan yon migration SEPARE
-- anvan (20261121192352_add_commission_type_first_card), deja komite nan yon
-- lòt transaksyon.
CREATE UNIQUE INDEX "Commission_userId_first_card_unique" ON "Commission"("userId") WHERE "type" = 'FIRST_CARD';
