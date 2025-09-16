-- AlterTable
ALTER TABLE "public"."Api" ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Endpoint" ADD COLUMN     "name" TEXT;
