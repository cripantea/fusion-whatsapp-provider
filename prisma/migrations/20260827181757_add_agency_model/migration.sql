/*
  Warnings:

  - You are about to drop the column `tenant_id` on the `users` table. All the data in the column will be lost.
  - Added the required column `agency_id` to the `tenants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `agency_id` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_tenant_id_fkey";

-- DropIndex
DROP INDEX "users_tenant_id_idx";

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "agency_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "tenant_id",
ADD COLUMN     "agency_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenants_agency_id_idx" ON "tenants"("agency_id");

-- CreateIndex
CREATE INDEX "users_agency_id_idx" ON "users"("agency_id");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
