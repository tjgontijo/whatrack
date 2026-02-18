-- AlterTable
ALTER TABLE "organization_profiles" ADD COLUMN     "ticketExpirationDays" INTEGER DEFAULT 30;

-- AlterTable
ALTER TABLE "ticket_tracking" ADD COLUMN     "lastEnrichmentAt" TIMESTAMP(3),
ADD COLUMN     "metaAccountId" TEXT,
ADD COLUMN     "metaAdId" TEXT,
ADD COLUMN     "metaAdIdAtEnrichment" TEXT,
ADD COLUMN     "metaAdName" TEXT,
ADD COLUMN     "metaAdSetId" TEXT,
ADD COLUMN     "metaAdSetName" TEXT,
ADD COLUMN     "metaCampaignId" TEXT,
ADD COLUMN     "metaCampaignName" TEXT,
ADD COLUMN     "metaEnrichmentError" TEXT,
ADD COLUMN     "metaEnrichmentStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "metaPlacement" TEXT,
ADD COLUMN     "metaSourceType" TEXT;

-- CreateTable
CREATE TABLE "meta_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "fbUserId" TEXT NOT NULL,
    "fbUserName" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_ad_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "connectionId" UUID NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "adAccountName" TEXT NOT NULL,
    "pixelId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_ad_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_conversion_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "eventName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "eventId" TEXT NOT NULL,
    "ctwaclid" TEXT,
    "metaAdId" TEXT,
    "fbtraceId" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "value" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meta_conversion_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_attribution_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticketId" UUID NOT NULL,
    "oldAdId" TEXT,
    "newAdId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meta_attribution_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meta_connections_organizationId_fbUserId_key" ON "meta_connections"("organizationId", "fbUserId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_ad_accounts_organizationId_adAccountId_key" ON "meta_ad_accounts"("organizationId", "adAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_conversion_events_eventId_key" ON "meta_conversion_events"("eventId");

-- CreateIndex
CREATE INDEX "meta_conversion_events_organizationId_idx" ON "meta_conversion_events"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_conversion_events_ticketId_eventName_key" ON "meta_conversion_events"("ticketId", "eventName");

-- CreateIndex
CREATE INDEX "meta_attribution_history_ticketId_idx" ON "meta_attribution_history"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_tracking_metaAdId_idx" ON "ticket_tracking"("metaAdId");

-- AddForeignKey
ALTER TABLE "meta_connections" ADD CONSTRAINT "meta_connections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_ad_accounts" ADD CONSTRAINT "meta_ad_accounts_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "meta_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_ad_accounts" ADD CONSTRAINT "meta_ad_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_conversion_events" ADD CONSTRAINT "meta_conversion_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_attribution_history" ADD CONSTRAINT "meta_attribution_history_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
