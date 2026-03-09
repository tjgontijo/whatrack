-- AlterTable
ALTER TABLE "billing_subscriptions"
ADD COLUMN "trialEndsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "billing_event_usages"
ADD COLUMN "externalId" TEXT,
ADD COLUMN "isOverage" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "billing_cycle_closeouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subscriptionId" UUID NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "cycleStartDate" TIMESTAMP(3) NOT NULL,
    "cycleEndDate" TIMESTAMP(3) NOT NULL,
    "eventsUsed" INTEGER NOT NULL,
    "eventLimit" INTEGER NOT NULL,
    "overageEvents" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "amountCharged" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "provider" TEXT NOT NULL,
    "providerInvoiceItemId" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_cycle_closeouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_event_usages_externalId_idx" ON "billing_event_usages"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_event_usages_subscriptionId_externalId_key"
ON "billing_event_usages"("subscriptionId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_cycle_closeouts_subscriptionId_cycleStartDate_cycleEnd_key"
ON "billing_cycle_closeouts"("subscriptionId", "cycleStartDate", "cycleEndDate");

-- CreateIndex
CREATE INDEX "billing_cycle_closeouts_status_idx" ON "billing_cycle_closeouts"("status");

-- CreateIndex
CREATE INDEX "billing_cycle_closeouts_billingCycle_idx" ON "billing_cycle_closeouts"("billingCycle");

-- CreateIndex
CREATE INDEX "billing_cycle_closeouts_subscriptionId_idx" ON "billing_cycle_closeouts"("subscriptionId");

-- AddForeignKey
ALTER TABLE "billing_cycle_closeouts"
ADD CONSTRAINT "billing_cycle_closeouts_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "billing_subscriptions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
