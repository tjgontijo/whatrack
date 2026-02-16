-- Lead table modifications
ALTER TABLE "leads" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'direct_creation';
ALTER TABLE "leads" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "leads" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Create indexes on Lead
CREATE INDEX "leads_source_idx" ON "leads"("source");
CREATE INDEX "leads_isActive_idx" ON "leads"("isActive");

-- Ticket table modifications
ALTER TABLE "tickets" ADD COLUMN "leadId" UUID NOT NULL;
ALTER TABLE "tickets" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'incoming_message';
ALTER TABLE "tickets" ADD COLUMN "originatedFrom" TEXT;

-- Add leadId foreign key to Ticket
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE;

-- Create indexes on Ticket
CREATE INDEX "tickets_source_idx" ON "tickets"("source");
CREATE INDEX "tickets_originatedFrom_idx" ON "tickets"("originatedFrom");
CREATE INDEX "tickets_windowExpiresAt_idx" ON "tickets"("windowExpiresAt");

-- Message table modifications
ALTER TABLE "whatsapp_messages" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'live';
ALTER TABLE "whatsapp_messages" ADD COLUMN "rawMeta" JSONB;

-- Create indexes on Message
CREATE INDEX "whatsapp_messages_source_idx" ON "whatsapp_messages"("source");
CREATE INDEX "whatsapp_messages_timestamp_idx" ON "whatsapp_messages"("timestamp");

-- WhatsAppConfig table modifications
ALTER TABLE "whatsapp_configs" ADD COLUMN "historySyncStatus" TEXT;
ALTER TABLE "whatsapp_configs" ADD COLUMN "historySyncStartedAt" TIMESTAMP(3);
ALTER TABLE "whatsapp_configs" ADD COLUMN "historySyncCompletedAt" TIMESTAMP(3);
ALTER TABLE "whatsapp_configs" ADD COLUMN "historySyncProgress" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "whatsapp_configs" ADD COLUMN "historySyncPhase" INTEGER;
ALTER TABLE "whatsapp_configs" ADD COLUMN "historySyncChunkOrder" INTEGER;
ALTER TABLE "whatsapp_configs" ADD COLUMN "historySyncError" TEXT;

-- Create indexes on WhatsAppConfig
CREATE INDEX "whatsapp_configs_historySyncStatus_idx" ON "whatsapp_configs"("historySyncStatus");

-- Create WhatsAppHistorySync table
CREATE TABLE "whatsapp_history_syncs" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
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

-- Add foreign key for WhatsAppHistorySync
ALTER TABLE "whatsapp_history_syncs" ADD CONSTRAINT "whatsapp_history_syncs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "whatsapp_configs"("id") ON DELETE CASCADE;

-- Create indexes on WhatsAppHistorySync
CREATE INDEX "whatsapp_history_syncs_connectionId_idx" ON "whatsapp_history_syncs"("connectionId");
CREATE INDEX "whatsapp_history_syncs_status_idx" ON "whatsapp_history_syncs"("status");
CREATE INDEX "whatsapp_history_syncs_createdAt_idx" ON "whatsapp_history_syncs"("createdAt");
