-- AlterTable
ALTER TABLE "crm_deal_stage_templates" ADD COLUMN     "isPersonal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organizationId" UUID,
ADD COLUMN     "projectId" UUID,
ALTER COLUMN "category" SET DEFAULT 'custom';

-- AddForeignKey
ALTER TABLE "crm_deal_stage_templates" ADD CONSTRAINT "crm_deal_stage_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_deal_stage_templates" ADD CONSTRAINT "crm_deal_stage_templates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "crm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
