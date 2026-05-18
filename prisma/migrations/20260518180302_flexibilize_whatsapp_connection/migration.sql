-- DropForeignKey
ALTER TABLE "whatsapp_connections" DROP CONSTRAINT "whatsapp_connections_projectId_fkey";

-- DropIndex
DROP INDEX "whatsapp_connections_projectId_wabaId_key";

-- AlterTable
ALTER TABLE "whatsapp_connections" ALTER COLUMN "projectId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "crm_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
