/*
  Warnings:

  - You are about to drop the column `errorCount` on the `Api` table. All the data in the column will be lost.
  - You are about to drop the column `totalCalls` on the `Api` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Api" DROP COLUMN "errorCount",
DROP COLUMN "totalCalls";

-- CreateTable
CREATE TABLE "public"."EndpointLog" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "userId" TEXT,
    "success" BOOLEAN NOT NULL,
    "latency" INTEGER NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EndpointLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApiLog" (
    "id" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "totalErrors" INTEGER NOT NULL DEFAULT 0,
    "averageLatency" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."EndpointLog" ADD CONSTRAINT "EndpointLog_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "public"."Endpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EndpointLog" ADD CONSTRAINT "EndpointLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApiLog" ADD CONSTRAINT "ApiLog_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "public"."Api"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
