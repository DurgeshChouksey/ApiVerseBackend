-- CreateTable
CREATE TABLE "public"."ApiDocs" (
    "id" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiDocs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ApiDocs" ADD CONSTRAINT "ApiDocs_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "public"."Api"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
