-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_onboarding_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_onboarding_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_connection_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_connection_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_health_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_health_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_audit_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_audit_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "emailVerified" BOOLEAN DEFAULT true,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "impersonatedBy" TEXT,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeOrganizationId" UUID,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterId" UUID NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "name" TEXT,
    "mail" TEXT,
    "phone" TEXT,
    "remote_jid" TEXT,
    "pushName" TEXT,
    "profilePicUrl" TEXT,
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "metaConversationId" TEXT,
    "messagesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "windowExpiresAt" TIMESTAMP(3),
    "windowOpen" BOOLEAN NOT NULL DEFAULT true,
    "assigneeId" UUID,
    "dealValue" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'open',
    "closedAt" TIMESTAMP(3),
    "closedReason" TEXT,
    "createdBy" TEXT NOT NULL DEFAULT 'SYSTEM',
    "messagesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_stages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_tracking" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticketId" UUID NOT NULL,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "gclid" TEXT,
    "fbclid" TEXT,
    "ctwaclid" TEXT,
    "ttclid" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'organic',
    "referrerUrl" TEXT,
    "landingPage" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "totalAmount" DECIMAL(12,2),
    "profit" DECIMAL(12,2),
    "discount" DECIMAL(12,2),
    "status" TEXT DEFAULT 'pending',
    "notes" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "ticketId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "productId" UUID,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "categoryId" UUID,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "cost" DECIMAL(12,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "cpf" TEXT,
    "onboardingStatus" TEXT NOT NULL DEFAULT 'pending',
    "onboardingCompletedAt" TIMESTAMP(3),
    "avgTicket" TEXT,
    "attendantsCount" TEXT,
    "mainChannel" TEXT,
    "leadsPerDay" TEXT,
    "monthlyRevenue" TEXT,
    "monthlyAdSpend" TEXT,
    "estimatedConversionRate" DOUBLE PRECISION,
    "estimatedCPL" DOUBLE PRECISION,
    "estimatedCAC" DOUBLE PRECISION,
    "estimatedROAS" DOUBLE PRECISION,
    "estimatedLeadValue" DOUBLE PRECISION,
    "leadsPerAttendant" DOUBLE PRECISION,
    "revenuePerAttendant" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnaeCode" TEXT NOT NULL,
    "cnaeDescription" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "tipo" TEXT,
    "porte" TEXT,
    "naturezaJuridica" TEXT,
    "capitalSocial" DECIMAL(65,30),
    "situacao" TEXT,
    "dataAbertura" TIMESTAMP(3),
    "dataSituacao" TIMESTAMP(3),
    "simplesOptante" BOOLEAN NOT NULL DEFAULT false,
    "simeiOptante" BOOLEAN NOT NULL DEFAULT false,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cep" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "qsa" JSONB,
    "atividadesSecundarias" JSONB,
    "authorizedByUserId" UUID NOT NULL,
    "authorizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "connectionId" UUID,
    "wabaId" TEXT,
    "phoneId" TEXT,
    "accessToken" TEXT,
    "displayPhone" TEXT,
    "verifiedName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "authorizationCode" TEXT,
    "accessTokenEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "tokenExpiresAt" TIMESTAMP(3),
    "tokenLastCheckedAt" TIMESTAMP(3),
    "tokenStatus" TEXT,
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "disconnectedBy" UUID,
    "lastWebhookAt" TIMESTAMP(3),
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processingError" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_onboarding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "authorizationCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorizedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "wabaId" TEXT,
    "ownerBusinessId" TEXT,
    "phoneNumberId" TEXT,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "wabaId" TEXT NOT NULL,
    "ownerBusinessId" TEXT,
    "phoneNumberId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "lastWebhookAt" TIMESTAMP(3),
    "lastHealthCheckAt" TIMESTAMP(3),
    "healthStatus" TEXT NOT NULL DEFAULT 'unknown',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_health" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "connectionId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "tokenValid" BOOLEAN,
    "tokenExpired" BOOLEAN,
    "apiResponse" TEXT,
    "responseTime" INTEGER,
    "lastCheck" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_webhook_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID,
    "payload" JSONB NOT NULL,
    "eventType" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "signatureValid" BOOLEAN,
    "processingError" TEXT,
    "processedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "trackingCode" TEXT,
    "connectionId" UUID,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wamid" TEXT NOT NULL,
    "leadId" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "conversation_uuid" UUID,
    "ticketId" UUID,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "body" TEXT,
    "mediaUrl" TEXT,
    "status" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_name_key" ON "user_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_statuses_name_key" ON "onboarding_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sale_statuses_name_key" ON "sale_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_onboarding_statuses_name_key" ON "whatsapp_onboarding_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connection_statuses_name_key" ON "whatsapp_connection_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_health_statuses_name_key" ON "whatsapp_health_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_audit_actions_name_key" ON "whatsapp_audit_actions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_phone_key" ON "user"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE INDEX "leads_organizationId_idx" ON "leads"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_organizationId_phone_key" ON "leads"("organizationId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "leads_organizationId_remote_jid_key" ON "leads"("organizationId", "remote_jid");

-- CreateIndex
CREATE INDEX "conversations_organizationId_idx" ON "conversations"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_leadId_instanceId_key" ON "conversations"("leadId", "instanceId");

-- CreateIndex
CREATE INDEX "tickets_organizationId_idx" ON "tickets"("organizationId");

-- CreateIndex
CREATE INDEX "tickets_conversationId_idx" ON "tickets"("conversationId");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_stageId_idx" ON "tickets"("stageId");

-- CreateIndex
CREATE INDEX "ticket_stages_organizationId_order_idx" ON "ticket_stages"("organizationId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_stages_organizationId_name_key" ON "ticket_stages"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_tracking_ticketId_key" ON "ticket_tracking"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_tracking_utmSource_idx" ON "ticket_tracking"("utmSource");

-- CreateIndex
CREATE INDEX "ticket_tracking_sourceType_idx" ON "ticket_tracking"("sourceType");

-- CreateIndex
CREATE INDEX "ticket_tracking_ctwaclid_idx" ON "ticket_tracking"("ctwaclid");

-- CreateIndex
CREATE INDEX "sales_organizationId_idx" ON "sales"("organizationId");

-- CreateIndex
CREATE INDEX "sales_createdAt_idx" ON "sales"("createdAt");

-- CreateIndex
CREATE INDEX "sales_ticketId_idx" ON "sales"("ticketId");

-- CreateIndex
CREATE INDEX "sale_items_organizationId_idx" ON "sale_items"("organizationId");

-- CreateIndex
CREATE INDEX "sale_items_saleId_idx" ON "sale_items"("saleId");

-- CreateIndex
CREATE INDEX "sale_items_productId_idx" ON "sale_items"("productId");

-- CreateIndex
CREATE INDEX "products_organizationId_idx" ON "products"("organizationId");

-- CreateIndex
CREATE INDEX "products_active_idx" ON "products"("active");

-- CreateIndex
CREATE UNIQUE INDEX "products_organizationId_name_key" ON "products"("organizationId", "name");

-- CreateIndex
CREATE INDEX "product_categories_organizationId_idx" ON "product_categories"("organizationId");

-- CreateIndex
CREATE INDEX "product_categories_active_idx" ON "product_categories"("active");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_organizationId_name_key" ON "product_categories"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "organization_profiles_organizationId_key" ON "organization_profiles"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_profiles_cpf_key" ON "organization_profiles"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "organization_companies_organizationId_key" ON "organization_companies"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_companies_cnpj_key" ON "organization_companies"("cnpj");

-- CreateIndex
CREATE INDEX "organization_companies_cnaeCode_idx" ON "organization_companies"("cnaeCode");

-- CreateIndex
CREATE INDEX "organization_companies_porte_idx" ON "organization_companies"("porte");

-- CreateIndex
CREATE INDEX "organization_companies_uf_idx" ON "organization_companies"("uf");

-- CreateIndex
CREATE INDEX "organization_companies_situacao_idx" ON "organization_companies"("situacao");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_configs_phoneId_key" ON "whatsapp_configs"("phoneId");

-- CreateIndex
CREATE INDEX "whatsapp_configs_connectionId_idx" ON "whatsapp_configs"("connectionId");

-- CreateIndex
CREATE INDEX "whatsapp_configs_processed_idx" ON "whatsapp_configs"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_onboarding_trackingCode_key" ON "whatsapp_onboarding"("trackingCode");

-- CreateIndex
CREATE INDEX "whatsapp_onboarding_organizationId_idx" ON "whatsapp_onboarding"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_onboarding_trackingCode_idx" ON "whatsapp_onboarding"("trackingCode");

-- CreateIndex
CREATE INDEX "whatsapp_onboarding_status_idx" ON "whatsapp_onboarding"("status");

-- CreateIndex
CREATE INDEX "whatsapp_onboarding_expiresAt_idx" ON "whatsapp_onboarding"("expiresAt");

-- CreateIndex
CREATE INDEX "whatsapp_connections_status_idx" ON "whatsapp_connections"("status");

-- CreateIndex
CREATE INDEX "whatsapp_connections_phoneNumberId_idx" ON "whatsapp_connections"("phoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connections_organizationId_wabaId_key" ON "whatsapp_connections"("organizationId", "wabaId");

-- CreateIndex
CREATE INDEX "whatsapp_health_organizationId_idx" ON "whatsapp_health"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_health_connectionId_idx" ON "whatsapp_health"("connectionId");

-- CreateIndex
CREATE INDEX "whatsapp_health_status_idx" ON "whatsapp_health"("status");

-- CreateIndex
CREATE INDEX "whatsapp_health_lastCheck_idx" ON "whatsapp_health"("lastCheck");

-- CreateIndex
CREATE INDEX "whatsapp_webhook_logs_organizationId_idx" ON "whatsapp_webhook_logs"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_webhook_logs_processed_idx" ON "whatsapp_webhook_logs"("processed");

-- CreateIndex
CREATE INDEX "whatsapp_webhook_logs_createdAt_idx" ON "whatsapp_webhook_logs"("createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_webhook_logs_processed_createdAt_idx" ON "whatsapp_webhook_logs"("processed", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_audit_logs_organizationId_idx" ON "whatsapp_audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_audit_logs_action_idx" ON "whatsapp_audit_logs"("action");

-- CreateIndex
CREATE INDEX "whatsapp_audit_logs_createdAt_idx" ON "whatsapp_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_audit_logs_organizationId_createdAt_idx" ON "whatsapp_audit_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_audit_logs_trackingCode_idx" ON "whatsapp_audit_logs"("trackingCode");

-- CreateIndex
CREATE INDEX "whatsapp_audit_logs_connectionId_idx" ON "whatsapp_audit_logs"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_wamid_key" ON "whatsapp_messages"("wamid");

-- CreateIndex
CREATE INDEX "whatsapp_messages_leadId_idx" ON "whatsapp_messages"("leadId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_instanceId_idx" ON "whatsapp_messages"("instanceId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_conversation_uuid_idx" ON "whatsapp_messages"("conversation_uuid");

-- CreateIndex
CREATE INDEX "whatsapp_messages_ticketId_idx" ON "whatsapp_messages"("ticketId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_role_fkey" FOREIGN KEY ("role") REFERENCES "user_roles"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "whatsapp_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ticket_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_stages" ADD CONSTRAINT "ticket_stages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_tracking" ADD CONSTRAINT "ticket_tracking_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_status_fkey" FOREIGN KEY ("status") REFERENCES "sale_statuses"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_onboardingStatus_fkey" FOREIGN KEY ("onboardingStatus") REFERENCES "onboarding_statuses"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_companies" ADD CONSTRAINT "organization_companies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_configs" ADD CONSTRAINT "whatsapp_configs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_configs" ADD CONSTRAINT "whatsapp_configs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_onboarding" ADD CONSTRAINT "whatsapp_onboarding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_onboarding" ADD CONSTRAINT "whatsapp_onboarding_status_fkey" FOREIGN KEY ("status") REFERENCES "whatsapp_onboarding_statuses"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_status_fkey" FOREIGN KEY ("status") REFERENCES "whatsapp_connection_statuses"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_healthStatus_fkey" FOREIGN KEY ("healthStatus") REFERENCES "whatsapp_health_statuses"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_health" ADD CONSTRAINT "whatsapp_health_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_health" ADD CONSTRAINT "whatsapp_health_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_health" ADD CONSTRAINT "whatsapp_health_status_fkey" FOREIGN KEY ("status") REFERENCES "whatsapp_health_statuses"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_webhook_logs" ADD CONSTRAINT "whatsapp_webhook_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_audit_logs" ADD CONSTRAINT "whatsapp_audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_audit_logs" ADD CONSTRAINT "whatsapp_audit_logs_action_fkey" FOREIGN KEY ("action") REFERENCES "whatsapp_audit_actions"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_audit_logs" ADD CONSTRAINT "whatsapp_audit_logs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "whatsapp_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "whatsapp_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_conversation_uuid_fkey" FOREIGN KEY ("conversation_uuid") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
