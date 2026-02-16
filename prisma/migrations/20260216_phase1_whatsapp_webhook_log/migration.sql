-- ============================================
-- Migration 4: WhatsAppWebhookLog Enhanced
-- ============================================

-- Melhorar tabela de webhook logs com Dead Letter Queue
ALTER TABLE "whatsapp_webhook_logs"
ADD COLUMN "processed" BOOLEAN DEFAULT false,
ADD COLUMN "signatureValid" BOOLEAN,
ADD COLUMN "processingError" TEXT,
ADD COLUMN "processedAt" TIMESTAMP,
ADD COLUMN "retryCount" INTEGER DEFAULT 0,
ADD COLUMN "lastRetryAt" TIMESTAMP;

-- Índices para DLQ e retry
CREATE INDEX "whatsapp_webhook_logs_processed_idx" ON "whatsapp_webhook_logs"("processed");
CREATE INDEX "whatsapp_webhook_logs_createdAt_idx" ON "whatsapp_webhook_logs"("createdAt");
CREATE INDEX "whatsapp_webhook_logs_processed_createdAt_idx" ON "whatsapp_webhook_logs"("processed", "createdAt");
