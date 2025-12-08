-- CreateTable
CREATE TABLE IF NOT EXISTS "account_actions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "user_name" TEXT,
    "user_wing" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "account_actions_user_id_idx" ON "account_actions"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "account_actions_created_at_idx" ON "account_actions"("created_at" DESC);
