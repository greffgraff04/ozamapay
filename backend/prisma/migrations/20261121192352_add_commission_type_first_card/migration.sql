-- AlterEnum
-- Separe nan pwòp migration li paske Postgres pa aksepte itilize yon nouvo
-- valè enum nan menm transaksyon kote li te ajoute (CREATE UNIQUE INDEX ...
-- WHERE "type" = 'FIRST_CARD' nan pwochen migration lan ta echwe ak "unsafe
-- use of new value of enum type" si l te nan menm fichye/transaksyon).
ALTER TYPE "CommissionType" ADD VALUE 'FIRST_CARD';
