-- Migration: Add unique constraints and lifecycle fields to whatsapp_configs
-- Created: 2026-02-14

-- Step 1: Remove accessToken column (we use global META_ACCESS_TOKEN now)
ALTER TABLE "whatsapp_configs" DROP COLUMN IF EXISTS "accessToken";

-- Step 2: Add new fields
ALTER TABLE "whatsapp_configs" ADD COLUMN IF NOT EXISTS "displayPhone" TEXT;
ALTER TABLE "whatsapp_configs" ADD COLUMN IF NOT EXISTS "verifiedName" TEXT;
ALTER TABLE "whatsapp_configs" ADD COLUMN IF NOT EXISTS "connectedAt" TIMESTAMP(3);
ALTER TABLE "whatsapp_configs" ADD COLUMN IF NOT EXISTS "lastWebhookAt" TIMESTAMP(3);

-- Step 3: Add unique constraints (prevents WABA/Phone duplication across orgs)
-- Note: These will fail if there are duplicate values. Clean data first if needed.
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_configs_wabaId_key" ON "whatsapp_configs"("wabaId") WHERE "wabaId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_configs_phoneId_key" ON "whatsapp_configs"("phoneId") WHERE "phoneId" IS NOT NULL;
