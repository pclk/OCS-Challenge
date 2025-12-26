-- Remove approval fields from users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "approved";
ALTER TABLE "users" DROP COLUMN IF EXISTS "pending_approval";

