/*
  Warnings:

  - A unique constraint covering the columns `[apiId,userId]` on the table `ApiKey` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."ApiKey_apiId_key_key";

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_apiId_userId_key" ON "public"."ApiKey"("apiId", "userId");
