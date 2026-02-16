-- Create WhatsAppHistorySync table (only missing piece)
CREATE TABLE IF NOT EXISTS "whatsapp_history_syncs" (
    "id" UUID NOT NULL,
    "connectionId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "phase" INTEGER,
    "chunkOrder" INTEGER,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "lastPayloadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_history_syncs_pkey" PRIMARY KEY ("id")
);

-- Add foreign key for WhatsAppHistorySync if not exists
ALTER TABLE "whatsapp_history_syncs" ADD CONSTRAINT "whatsapp_history_syncs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "whatsapp_configs"("id") ON DELETE CASCADE;

-- Create indexes on WhatsAppHistorySync
CREATE INDEX IF NOT EXISTS "whatsapp_history_syncs_connectionId_idx" ON "whatsapp_history_syncs"("connectionId");
CREATE INDEX IF NOT EXISTS "whatsapp_history_syncs_status_idx" ON "whatsapp_history_syncs"("status");
CREATE INDEX IF NOT EXISTS "whatsapp_history_syncs_createdAt_idx" ON "whatsapp_history_syncs"("createdAt");
