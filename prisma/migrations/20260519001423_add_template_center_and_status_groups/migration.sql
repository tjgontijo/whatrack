-- AlterTable
ALTER TABLE "crm_deal_stage_meta_rules" ADD COLUMN     "customDataMapping" JSONB,
ADD COLUMN     "includeAddress" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "includeEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "includeExternalId" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "includeFullName" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "includePhone" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "crm_deal_stages" ADD COLUMN     "probability" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "statusGroup" TEXT NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "crm_deal_stage_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "icon" TEXT,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_deal_stage_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_deal_stage_template_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "templateId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "statusGroup" TEXT NOT NULL,
    "probability" INTEGER NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "suggestedMetaEventName" TEXT,

    CONSTRAINT "crm_deal_stage_template_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "crm_deal_stage_template_items" ADD CONSTRAINT "crm_deal_stage_template_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "crm_deal_stage_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
