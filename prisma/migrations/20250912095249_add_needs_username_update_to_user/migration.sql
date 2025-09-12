-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "needsUsernameUpdate" BOOLEAN NOT NULL DEFAULT false;
