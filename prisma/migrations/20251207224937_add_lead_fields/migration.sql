-- AlterTable
ALTER TABLE "leads" ADD COLUMN "assignedTo" TEXT,
ADD COLUMN "notes" TEXT,
ADD COLUMN "status" TEXT DEFAULT 'new';
