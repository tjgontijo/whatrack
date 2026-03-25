-- DropForeignKey
ALTER TABLE "whatsapp_campaign_approvals" DROP CONSTRAINT "whatsapp_campaign_approvals_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "whatsapp_campaign_approvals" DROP CONSTRAINT "whatsapp_campaign_approvals_userId_fkey";

-- DropForeignKey
ALTER TABLE "whatsapp_campaign_imports" DROP CONSTRAINT "whatsapp_campaign_imports_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "whatsapp_campaigns" DROP CONSTRAINT "whatsapp_campaigns_approvedById_fkey";

-- AlterTable
ALTER TABLE "crm_tickets" ADD COLUMN     "stageEnteredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "whatsapp_campaigns" DROP COLUMN "approvedAt",
DROP COLUMN "approvedById",
ADD COLUMN     "audienceSourceId" UUID,
ADD COLUMN     "audienceSourceType" TEXT;

-- DropTable
DROP TABLE "whatsapp_campaign_approvals";

-- DropTable
DROP TABLE "whatsapp_campaign_imports";

-- CreateTable
CREATE TABLE "crm_lead_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_lead_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_lead_tag_assignments" (
    "leadId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_lead_tag_assignments_pkey" PRIMARY KEY ("leadId","tagId")
);

-- CreateTable
CREATE TABLE "whatsapp_contact_lists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_contact_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_contact_list_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listId" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "normalizedPhone" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_contact_list_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_audience_segments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_audience_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_campaign_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "userId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_campaign_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_lead_tags_organizationId_idx" ON "crm_lead_tags"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_lead_tags_organizationId_name_key" ON "crm_lead_tags"("organizationId", "name");

-- CreateIndex
CREATE INDEX "crm_lead_tag_assignments_leadId_idx" ON "crm_lead_tag_assignments"("leadId");

-- CreateIndex
CREATE INDEX "crm_lead_tag_assignments_tagId_idx" ON "crm_lead_tag_assignments"("tagId");

-- CreateIndex
CREATE INDEX "whatsapp_contact_lists_organizationId_idx" ON "whatsapp_contact_lists"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_contact_list_members_listId_idx" ON "whatsapp_contact_list_members"("listId");

-- CreateIndex
CREATE INDEX "whatsapp_contact_list_members_normalizedPhone_idx" ON "whatsapp_contact_list_members"("normalizedPhone");

-- CreateIndex
CREATE INDEX "whatsapp_contact_list_members_listId_normalizedPhone_idx" ON "whatsapp_contact_list_members"("listId", "normalizedPhone");

-- CreateIndex
CREATE INDEX "whatsapp_audience_segments_organizationId_idx" ON "whatsapp_audience_segments"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_audience_segments_projectId_idx" ON "whatsapp_audience_segments"("projectId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_events_campaignId_idx" ON "whatsapp_campaign_events"("campaignId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_events_type_idx" ON "whatsapp_campaign_events"("type");

-- AddForeignKey
ALTER TABLE "crm_lead_tags" ADD CONSTRAINT "crm_lead_tags_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_lead_tag_assignments" ADD CONSTRAINT "crm_lead_tag_assignments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_lead_tag_assignments" ADD CONSTRAINT "crm_lead_tag_assignments_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "crm_lead_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contact_lists" ADD CONSTRAINT "whatsapp_contact_lists_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contact_list_members" ADD CONSTRAINT "whatsapp_contact_list_members_listId_fkey" FOREIGN KEY ("listId") REFERENCES "whatsapp_contact_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_audience_segments" ADD CONSTRAINT "whatsapp_audience_segments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_audience_segments" ADD CONSTRAINT "whatsapp_audience_segments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "crm_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_events" ADD CONSTRAINT "whatsapp_campaign_events_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "whatsapp_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
