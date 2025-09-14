/*
  Warnings:

  - You are about to drop the column `parameters` on the `Endpoint` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Endpoint" DROP COLUMN "parameters",
ADD COLUMN     "bodyContentType" TEXT,
ADD COLUMN     "bodyParameters" JSONB,
ADD COLUMN     "queryParameters" JSONB;
