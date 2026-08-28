-- CreateEnum
CREATE TYPE "AppUserStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "whatsapp_connections" ADD COLUMN     "app_user_id" TEXT,
ALTER COLUMN "tenant_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "apps" (
    "id" TEXT NOT NULL,
    "agency_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "api_secret" TEXT NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_users" (
    "id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "external_customer_id" TEXT NOT NULL,
    "status" "AppUserStatus" NOT NULL DEFAULT 'INACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "apps_api_key_key" ON "apps"("api_key");

-- CreateIndex
CREATE INDEX "apps_agency_id_idx" ON "apps"("agency_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_users_app_id_external_customer_id_key" ON "app_users"("app_id", "external_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connections_app_user_id_key" ON "whatsapp_connections"("app_user_id");

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_app_user_id_fkey" FOREIGN KEY ("app_user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
-- Una connessione appartiene esattamente a un tenant OPPURE a un appUser, mai a entrambi né a nessuno dei due.
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_owner_xor_check"
    CHECK (
        (tenant_id IS NOT NULL AND app_user_id IS NULL) OR
        (tenant_id IS NULL AND app_user_id IS NOT NULL)
    );
