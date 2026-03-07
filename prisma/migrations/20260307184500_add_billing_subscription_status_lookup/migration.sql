-- CreateTable
CREATE TABLE "billing_subscription_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_subscription_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_subscription_statuses_name_key" ON "billing_subscription_statuses"("name");

-- Seed lookup values required by existing subscriptions
INSERT INTO "billing_subscription_statuses" ("name", "description", "createdAt", "updatedAt")
VALUES
    ('active', 'Assinatura ativa e com renovação habilitada.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('paused', 'Assinatura pausada aguardando regularização.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('canceled', 'Assinatura cancelada e sem novas renovações.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('past_due', 'Assinatura com pagamento pendente ou em atraso.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- Normalize legacy rows before adding the foreign key
UPDATE "billing_subscriptions"
SET "status" = 'active'
WHERE "status" NOT IN ('active', 'paused', 'canceled', 'past_due');

-- AddForeignKey
ALTER TABLE "billing_subscriptions"
ADD CONSTRAINT "billing_subscriptions_status_fkey"
FOREIGN KEY ("status") REFERENCES "billing_subscription_statuses"("name")
ON DELETE RESTRICT ON UPDATE CASCADE;
