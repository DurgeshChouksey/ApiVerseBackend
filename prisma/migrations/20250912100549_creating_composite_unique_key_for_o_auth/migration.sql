/*
  Warnings:

  - A unique constraint covering the columns `[providerId,provider]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "User_providerId_provider_key" ON "public"."User"("providerId", "provider");
