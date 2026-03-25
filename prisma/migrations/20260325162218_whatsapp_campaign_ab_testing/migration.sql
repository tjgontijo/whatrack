/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,projectId,name]` on the table `crm_lead_tags` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId,projectId,name]` on the table `crm_ticket_stages` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[listId,normalizedPhone]` on the table `whatsapp_contact_list_members` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "crm_lead_tags_organizationId_name_key";

-- DropIndex
DROP INDEX "crm_ticket_stages_organizationId_name_key";

-- DropIndex
DROP INDEX "crm_ticket_stages_organizationId_order_idx";

-- DropIndex
DROP INDEX "whatsapp_contact_list_members_listId_normalizedPhone_idx";

-- AlterTable
ALTER TABLE "crm_conversations" ADD COLUMN     "projectId" UUID;

-- AlterTable
ALTER TABLE "crm_lead_tags" ADD COLUMN     "projectId" UUID;

-- AlterTable
ALTER TABLE "crm_ticket_stages" ADD COLUMN     "projectId" UUID;

-- AlterTable
ALTER TABLE "whatsapp_campaign_dispatch_groups" ADD COLUMN     "isRemainder" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "whatsapp_campaign_recipients" ADD COLUMN     "variantId" UUID;

-- AlterTable
ALTER TABLE "whatsapp_campaigns" ADD COLUMN     "abTestConfig" JSONB,
ADD COLUMN     "isAbTest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shouldCreateLeads" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "whatsapp_contact_lists" ADD COLUMN     "projectId" UUID;

-- CreateTable
CREATE TABLE "whatsapp_campaign_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "dispatchGroupId" UUID NOT NULL,
    "splitPercent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_campaign_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_campaign_variants_dispatchGroupId_key" ON "whatsapp_campaign_variants"("dispatchGroupId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_variants_campaignId_idx" ON "whatsapp_campaign_variants"("campaignId");

-- CreateIndex
CREATE INDEX "crm_conversations_projectId_idx" ON "crm_conversations"("projectId");

-- CreateIndex
CREATE INDEX "crm_lead_tags_projectId_idx" ON "crm_lead_tags"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_lead_tags_organizationId_projectId_name_key" ON "crm_lead_tags"("organizationId", "projectId", "name");

-- CreateIndex
CREATE INDEX "crm_ticket_stages_organizationId_projectId_order_idx" ON "crm_ticket_stages"("organizationId", "projectId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "crm_ticket_stages_organizationId_projectId_name_key" ON "crm_ticket_stages"("organizationId", "projectId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_contact_list_members_listId_normalizedPhone_key" ON "whatsapp_contact_list_members"("listId", "normalizedPhone");

-- CreateIndex
CREATE INDEX "whatsapp_contact_lists_projectId_idx" ON "whatsapp_contact_lists"("projectId");

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_variants" ADD CONSTRAINT "whatsapp_campaign_variants_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "whatsapp_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_variants" ADD CONSTRAINT "whatsapp_campaign_variants_dispatchGroupId_fkey" FOREIGN KEY ("dispatchGroupId") REFERENCES "whatsapp_campaign_dispatch_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_recipients" ADD CONSTRAINT "whatsapp_campaign_recipients_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "whatsapp_campaign_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
