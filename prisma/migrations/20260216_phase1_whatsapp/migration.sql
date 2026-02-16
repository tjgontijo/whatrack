-- ============================================
-- Migration 1: WhatsAppOnboarding Table
-- ============================================

CREATE TABLE "whatsapp_onboarding" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,

  -- OAuth Flow
  "trackingCode" TEXT UNIQUE NOT NULL,
  "authorizationCode" TEXT,

  -- Onboarding Status
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'completed', 'expired', 'failed')),
  "initiatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "authorizedAt" TIMESTAMP,
  "completedAt" TIMESTAMP,
  "expiresAt" TIMESTAMP NOT NULL,

  -- Meta WABA Info (populated after PARTNER_ADDED webhook)
  "wabaId" TEXT,
  "ownerBusinessId" TEXT,
  "phoneNumberId" TEXT,

  -- Error Tracking
  "errorMessage" TEXT,
  "errorCode" TEXT,

  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX "whatsapp_onboarding_organizationId_idx" ON "whatsapp_onboarding"("organizationId");
CREATE INDEX "whatsapp_onboarding_trackingCode_idx" ON "whatsapp_onboarding"("trackingCode");
CREATE INDEX "whatsapp_onboarding_status_idx" ON "whatsapp_onboarding"("status");
CREATE INDEX "whatsapp_onboarding_expiresAt_idx" ON "whatsapp_onboarding"("expiresAt");
