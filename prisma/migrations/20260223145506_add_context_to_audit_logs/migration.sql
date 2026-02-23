/*
  Warnings:

  - You are about to drop the column `pixelId` on the `meta_ad_accounts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "avgResponseTimeSec" INTEGER,
ADD COLUMN     "firstResponseTimeSec" INTEGER,
ADD COLUMN     "inboundMessagesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastInboundAt" TIMESTAMP(3),
ADD COLUMN     "lastOutboundAt" TIMESTAMP(3),
ADD COLUMN     "outboundMessagesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unreadCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "firstMessageAt" TIMESTAMP(3),
ADD COLUMN     "lifetimeValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalTickets" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "meta_ad_accounts" DROP COLUMN "pixelId";

-- AlterTable
ALTER TABLE "organization_profiles" ADD COLUMN     "aiCopilotActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "aiCopilotInstructions" TEXT;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "firstResponseTimeSec" INTEGER,
ADD COLUMN     "inboundMessagesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastInboundAt" TIMESTAMP(3),
ADD COLUMN     "lastOutboundAt" TIMESTAMP(3),
ADD COLUMN     "outboundMessagesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "resolutionTimeSec" INTEGER;

-- CreateTable
CREATE TABLE "meta_pixels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "name" TEXT,
    "pixelId" TEXT NOT NULL,
    "capiToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_pixels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversion_approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "eventName" TEXT NOT NULL,
    "productName" TEXT,
    "dealValue" DECIMAL(12,2),
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "reasoning" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversion_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_trigger_event_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_trigger_event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_schema_field_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_schema_field_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_insight_action_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_insight_action_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_agents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'llama-3.3-70b-versatile',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_triggers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agentId" UUID NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT 'TICKET_CLOSED',
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_schema_fields" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agentId" UUID NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL DEFAULT 'STRING',
    "description" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "options" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_schema_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_insights" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUGGESTION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meta_pixels_organizationId_pixelId_key" ON "meta_pixels"("organizationId", "pixelId");

-- CreateIndex
CREATE INDEX "ai_conversion_approvals_organizationId_idx" ON "ai_conversion_approvals"("organizationId");

-- CreateIndex
CREATE INDEX "ai_conversion_approvals_ticketId_idx" ON "ai_conversion_approvals"("ticketId");

-- CreateIndex
CREATE INDEX "ai_conversion_approvals_status_idx" ON "ai_conversion_approvals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_trigger_event_types_name_key" ON "ai_trigger_event_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ai_schema_field_types_name_key" ON "ai_schema_field_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ai_insight_action_statuses_name_key" ON "ai_insight_action_statuses"("name");

-- CreateIndex
CREATE INDEX "ai_agents_organizationId_idx" ON "ai_agents"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_agents_organizationId_name_key" ON "ai_agents"("organizationId", "name");

-- CreateIndex
CREATE INDEX "ai_triggers_agentId_idx" ON "ai_triggers"("agentId");

-- CreateIndex
CREATE INDEX "ai_schema_fields_agentId_idx" ON "ai_schema_fields"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_schema_fields_agentId_fieldName_key" ON "ai_schema_fields"("agentId", "fieldName");

-- CreateIndex
CREATE INDEX "ai_insights_organizationId_idx" ON "ai_insights"("organizationId");

-- CreateIndex
CREATE INDEX "ai_insights_ticketId_idx" ON "ai_insights"("ticketId");

-- CreateIndex
CREATE INDEX "ai_insights_agentId_idx" ON "ai_insights"("agentId");

-- CreateIndex
CREATE INDEX "org_audit_logs_organizationId_idx" ON "org_audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "org_audit_logs_userId_idx" ON "org_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "org_audit_logs_createdAt_idx" ON "org_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "org_audit_logs_requestId_idx" ON "org_audit_logs"("requestId");

-- AddForeignKey
ALTER TABLE "meta_pixels" ADD CONSTRAINT "meta_pixels_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversion_approvals" ADD CONSTRAINT "ai_conversion_approvals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversion_approvals" ADD CONSTRAINT "ai_conversion_approvals_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_triggers" ADD CONSTRAINT "ai_triggers_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_triggers" ADD CONSTRAINT "ai_triggers_eventType_fkey" FOREIGN KEY ("eventType") REFERENCES "ai_trigger_event_types"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_schema_fields" ADD CONSTRAINT "ai_schema_fields_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_schema_fields" ADD CONSTRAINT "ai_schema_fields_fieldType_fkey" FOREIGN KEY ("fieldType") REFERENCES "ai_schema_field_types"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_status_fkey" FOREIGN KEY ("status") REFERENCES "ai_insight_action_statuses"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_audit_logs" ADD CONSTRAINT "org_audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_audit_logs" ADD CONSTRAINT "org_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
