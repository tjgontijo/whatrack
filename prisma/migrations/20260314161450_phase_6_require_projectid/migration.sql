-- AlterTable: MetaConnection
ALTER TABLE "meta_connections" DROP CONSTRAINT "meta_connections_projectId_fkey", ALTER COLUMN "projectId" SET NOT NULL, ADD CONSTRAINT "meta_connections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: MetaAdAccount  
ALTER TABLE "meta_ad_accounts" DROP CONSTRAINT "meta_ad_accounts_projectId_fkey", ALTER COLUMN "projectId" SET NOT NULL, ADD CONSTRAINT "meta_ad_accounts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: MetaPixel
ALTER TABLE "meta_pixels" DROP CONSTRAINT "meta_pixels_projectId_fkey", ALTER COLUMN "projectId" SET NOT NULL, ADD CONSTRAINT "meta_pixels_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: WhatsAppConnection
ALTER TABLE "whatsapp_connections" DROP CONSTRAINT "whatsapp_connections_projectId_fkey", ALTER COLUMN "projectId" SET NOT NULL, ADD CONSTRAINT "whatsapp_connections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: WhatsAppConfig
ALTER TABLE "whatsapp_configs" DROP CONSTRAINT "whatsapp_configs_projectId_fkey", ALTER COLUMN "projectId" SET NOT NULL, ADD CONSTRAINT "whatsapp_configs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: WhatsAppOnboarding
ALTER TABLE "whatsapp_onboarding" DROP CONSTRAINT "whatsapp_onboarding_projectId_fkey", ALTER COLUMN "projectId" SET NOT NULL, ADD CONSTRAINT "whatsapp_onboarding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
