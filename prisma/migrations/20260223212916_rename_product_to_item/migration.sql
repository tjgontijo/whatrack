/*
  Warnings:

  - You are about to drop the column `productName` on the `ai_conversion_approvals` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `sale_items` table. All the data in the column will be lost.
  - You are about to drop the `product_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `products` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "product_categories" DROP CONSTRAINT "product_categories_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "sale_items" DROP CONSTRAINT "sale_items_productId_fkey";

-- DropIndex
DROP INDEX "sale_items_productId_idx";

-- AlterTable
ALTER TABLE "ai_conversion_approvals" DROP COLUMN "productName",
ADD COLUMN     "itemName" TEXT;

-- AlterTable
ALTER TABLE "sale_items" DROP COLUMN "productId",
ADD COLUMN     "itemId" UUID;

-- DropTable
DROP TABLE "product_categories";

-- DropTable
DROP TABLE "products";

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "categoryId" UUID,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "cost" DECIMAL(12,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "items_organizationId_idx" ON "items"("organizationId");

-- CreateIndex
CREATE INDEX "items_active_idx" ON "items"("active");

-- CreateIndex
CREATE UNIQUE INDEX "items_organizationId_name_key" ON "items"("organizationId", "name");

-- CreateIndex
CREATE INDEX "item_categories_organizationId_idx" ON "item_categories"("organizationId");

-- CreateIndex
CREATE INDEX "item_categories_active_idx" ON "item_categories"("active");

-- CreateIndex
CREATE UNIQUE INDEX "item_categories_organizationId_name_key" ON "item_categories"("organizationId", "name");

-- CreateIndex
CREATE INDEX "sale_items_itemId_idx" ON "sale_items"("itemId");

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "item_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
