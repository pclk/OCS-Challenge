-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "has_logged_in" BOOLEAN NOT NULL DEFAULT false;

