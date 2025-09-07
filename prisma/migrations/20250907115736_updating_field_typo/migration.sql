/*
  Warnings:

  - You are about to drop the column `verificatioTokenExpires` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "verificatioTokenExpires",
ADD COLUMN     "verificationTokenExpires" TIMESTAMP(3);
