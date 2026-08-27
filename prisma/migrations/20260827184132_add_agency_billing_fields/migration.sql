
-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('DEVELOPER', 'TEAM', 'AGENCY', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('INACTIVE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');

-- AlterTable
ALTER TABLE "agencies" ADD COLUMN     "max_connections" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "plan_type" "PlanType" NOT NULL DEFAULT 'DEVELOPER',
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT,
ADD COLUMN     "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "agencies_stripe_customer_id_key" ON "agencies"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_stripe_subscription_id_key" ON "agencies"("stripe_subscription_id");

