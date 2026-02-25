/*
  Warnings:

  - You are about to drop the column `cost` on the `items` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "items" DROP COLUMN "cost",
DROP COLUMN "price";
