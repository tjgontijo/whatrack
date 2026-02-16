-- ============================================
-- Migration 3: Enhanced WhatsAppConfig
-- ============================================

-- Relacionar WhatsAppConfig com WhatsAppConnection
ALTER TABLE "whatsapp_configs"
ADD COLUMN "connectionId" UUID REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE,
ADD COLUMN "processed" BOOLEAN DEFAULT false,
ADD COLUMN "processingError" TEXT,
ADD COLUMN "retryCount" INTEGER DEFAULT 0;

-- Índices para webhook retry logic
CREATE INDEX "whatsapp_configs_connectionId_idx" ON "whatsapp_configs"("connectionId");
CREATE INDEX "whatsapp_configs_processed_idx" ON "whatsapp_configs"("processed");
