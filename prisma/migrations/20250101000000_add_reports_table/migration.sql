-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('ACCOUNT_CONFLICT', 'NEW_ACCOUNT_REQUEST');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "wing" TEXT NOT NULL,
    "password" TEXT,
    "type" "ReportType" NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_wing_idx" ON "reports"("wing");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_created_at_idx" ON "reports"("created_at" DESC);



