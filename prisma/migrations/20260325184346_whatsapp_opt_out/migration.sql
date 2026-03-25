-- CreateTable
CREATE TABLE "whatsapp_opt_outs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "campaignId" UUID,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_opt_outs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_opt_outs_organizationId_idx" ON "whatsapp_opt_outs"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_opt_outs_organizationId_createdAt_idx" ON "whatsapp_opt_outs"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_opt_outs_organizationId_phone_key" ON "whatsapp_opt_outs"("organizationId", "phone");

-- AddForeignKey
ALTER TABLE "whatsapp_opt_outs" ADD CONSTRAINT "whatsapp_opt_outs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_opt_outs" ADD CONSTRAINT "whatsapp_opt_outs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "whatsapp_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
