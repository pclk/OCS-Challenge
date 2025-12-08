-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" TEXT,
ADD COLUMN IF NOT EXISTS "approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "pending_approval" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_name_wing_key" ON "users"("name", "wing");

