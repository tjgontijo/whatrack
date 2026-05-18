/*
  Warnings:

  - You are about to drop the column `avgTicket` on the `org_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `ticketExpirationDays` on the `org_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "org_profiles" DROP COLUMN "avgTicket",
DROP COLUMN "ticketExpirationDays",
ADD COLUMN     "avgDeal" TEXT,
ADD COLUMN     "dealExpirationDays" INTEGER DEFAULT 30;
