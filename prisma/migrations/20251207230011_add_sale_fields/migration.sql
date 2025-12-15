-- AlterTable
ALTER TABLE "sales" ADD COLUMN "profit" DECIMAL(12,2),
ADD COLUMN "discount" DECIMAL(12,2),
ADD COLUMN "createdBy" TEXT,
ADD COLUMN "updatedBy" TEXT,
ADD COLUMN "statusChangedAt" TIMESTAMP(3);
