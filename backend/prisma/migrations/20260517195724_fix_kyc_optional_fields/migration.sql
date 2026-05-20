/*
  Warnings:

  - Made the column `selfieImage` on table `KYC` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "KYC" ALTER COLUMN "fullName" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "selfieImage" SET NOT NULL;
