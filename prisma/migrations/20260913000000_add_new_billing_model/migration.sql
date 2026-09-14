-- CreateEnum
CREATE TYPE "AgencyBillingStatus" AS ENUM ('NOT_CONFIGURED', 'READY', 'REQUIRES_ACTION', 'PAST_DUE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ConnectionBillingStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID', 'PAYMENT_FAILED', 'CANCELED');

-- AlterTable: add new billing model fields to agencies
ALTER TABLE "agencies"
  ADD COLUMN "billing_status"               "AgencyBillingStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  ADD COLUMN "auto_billing_enabled"         BOOLEAN              NOT NULL DEFAULT false,
  ADD COLUMN "auto_billing_accepted_at"     TIMESTAMP(3),
  ADD COLUMN "global_connection_limit"      INTEGER,
  ADD COLUMN "default_app_connection_limit" INTEGER,
  ADD COLUMN "platform_limit_override"      INTEGER,
  ADD COLUMN "default_payment_method_id"    TEXT,
  ADD COLUMN "billing_setup_completed_at"   TIMESTAMP(3);

-- AlterTable: per-App connection limit
ALTER TABLE "apps"
  ADD COLUMN "connection_limit" INTEGER;

-- AlterTable: per-connection billing status
ALTER TABLE "whatsapp_connections"
  ADD COLUMN "billing_status" "ConnectionBillingStatus" NOT NULL DEFAULT 'NOT_REQUIRED';
