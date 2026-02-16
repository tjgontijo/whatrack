-- ============================================
-- Migration 2: WhatsAppConnection Table
-- ============================================

CREATE TABLE "whatsapp_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,

  -- Meta WABA Identifiers
  "wabaId" TEXT NOT NULL,
  "ownerBusinessId" TEXT,
  "phoneNumberId" TEXT,

  -- Connection Status
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'error')),
  "connectedAt" TIMESTAMP,
  "disconnectedAt" TIMESTAMP,

  -- Health & Monitoring
  "lastWebhookAt" TIMESTAMP,
  "lastHealthCheckAt" TIMESTAMP,
  "healthStatus" TEXT DEFAULT 'unknown' CHECK (healthStatus IN ('unknown', 'healthy', 'warning', 'error')),

  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices
CREATE UNIQUE INDEX "whatsapp_connections_organizationId_wabaId_idx" ON "whatsapp_connections"("organizationId", "wabaId");
CREATE INDEX "whatsapp_connections_status_idx" ON "whatsapp_connections"("status");
CREATE INDEX "whatsapp_connections_phoneNumberId_idx" ON "whatsapp_connections"("phoneNumberId");
