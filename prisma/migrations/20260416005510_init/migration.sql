-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('INACTIVE', 'PENDING', 'ACTIVE', 'OVERDUE', 'CANCELED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "BillingFailureReason" AS ENUM ('EXPIRED', 'DENIED', 'CANCELED_BY_USER', 'FAILED_DEBIT', 'OTHER');

-- CreateEnum
CREATE TYPE "BillingInvoiceStatus" AS ENUM ('PENDING', 'CONFIRMED', 'RECEIVED', 'OVERDUE', 'REFUNDED', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL', 'DUNNING_REQUESTED', 'DUNNING_RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingPaymentMethod" AS ENUM ('CREDIT_CARD', 'PIX', 'PIX_AUTOMATIC', 'BOLETO');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "AuditActor" AS ENUM ('USER', 'ADMIN', 'SYSTEM');

-- CreateTable
CREATE TABLE "auth_user_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_onboarding_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_onboarding_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_sale_statuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_sale_statuses_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "auth_user" (
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

    CONSTRAINT "auth_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_session" (
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

    CONSTRAINT "auth_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_account" (
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

    CONSTRAINT "auth_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_verification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_ticket_tracking" (
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
    "metaAdId" TEXT,
    "metaAdSetId" TEXT,
    "metaCampaignId" TEXT,
    "metaAccountId" TEXT,
    "metaAdName" TEXT,
    "metaAdSetName" TEXT,
    "metaCampaignName" TEXT,
    "metaPlacement" TEXT,
    "metaSourceType" TEXT,
    "metaEnrichmentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "metaEnrichmentError" TEXT,
    "lastEnrichmentAt" TIMESTAMP(3),
    "metaAdIdAtEnrichment" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'organic',
    "referrerUrl" TEXT,
    "landingPage" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_ticket_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "asaasCustomerId" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_profiles" (
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
    "ticketExpirationDays" INTEGER DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_role_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationRoleId" UUID NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_member_permission_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "memberId" UUID NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_member_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterId" UUID NOT NULL,

    CONSTRAINT "org_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "name" TEXT,
    "mail" TEXT,
    "phone" TEXT,
    "remote_jid" TEXT,
    "pushName" TEXT,
    "profilePicUrl" TEXT,
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'direct_creation',
    "lastSyncedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "firstMessageAt" TIMESTAMP(3),
    "totalTickets" INTEGER NOT NULL DEFAULT 0,
    "lifetimeValue" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "crm_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "leadId" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "metaConversationId" TEXT,
    "messagesCount" INTEGER NOT NULL DEFAULT 0,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "inboundMessagesCount" INTEGER NOT NULL DEFAULT 0,
    "outboundMessagesCount" INTEGER NOT NULL DEFAULT 0,
    "lastInboundAt" TIMESTAMP(3),
    "lastOutboundAt" TIMESTAMP(3),
    "avgResponseTimeSec" INTEGER,
    "firstResponseTimeSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "conversationId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "stageEnteredAt" TIMESTAMP(3),
    "windowExpiresAt" TIMESTAMP(3),
    "windowOpen" BOOLEAN NOT NULL DEFAULT true,
    "assigneeId" UUID,
    "dealValue" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'open',
    "closedAt" TIMESTAMP(3),
    "closedReason" TEXT,
    "createdBy" TEXT NOT NULL DEFAULT 'SYSTEM',
    "messagesCount" INTEGER NOT NULL DEFAULT 0,
    "inboundMessagesCount" INTEGER NOT NULL DEFAULT 0,
    "outboundMessagesCount" INTEGER NOT NULL DEFAULT 0,
    "lastInboundAt" TIMESTAMP(3),
    "lastOutboundAt" TIMESTAMP(3),
    "firstResponseTimeSec" INTEGER,
    "resolutionTimeSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "leadId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'incoming_message',
    "originatedFrom" TEXT,

    CONSTRAINT "crm_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_ticket_stages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_ticket_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_sales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
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

    CONSTRAINT "crm_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_sale_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "itemId" UUID,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "categoryId" UUID,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_item_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_item_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_companies" (
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

    CONSTRAINT "org_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
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
    "historySyncStatus" TEXT,
    "historySyncStartedAt" TIMESTAMP(3),
    "historySyncCompletedAt" TIMESTAMP(3),
    "historySyncProgress" INTEGER NOT NULL DEFAULT 0,
    "historySyncPhase" INTEGER,
    "historySyncChunkOrder" INTEGER,
    "historySyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_onboarding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
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
    "projectId" UUID NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_history_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MARKETING',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "templateName" TEXT,
    "templateLang" TEXT NOT NULL DEFAULT 'pt_BR',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" UUID,
    "shouldCreateLeads" BOOLEAN NOT NULL DEFAULT true,
    "isAbTest" BOOLEAN NOT NULL DEFAULT false,
    "abTestConfig" JSONB,
    "audienceSourceType" TEXT,
    "audienceSourceId" UUID,

    CONSTRAINT "whatsapp_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_lead_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_lead_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_lead_tag_assignments" (
    "leadId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_lead_tag_assignments_pkey" PRIMARY KEY ("leadId","tagId")
);

-- CreateTable
CREATE TABLE "whatsapp_contact_lists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_contact_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_contact_list_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listId" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "normalizedPhone" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_contact_list_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_audience_segments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_audience_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_campaign_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "userId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_campaign_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_campaign_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "dispatchGroupId" UUID NOT NULL,
    "splitPercent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_campaign_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_campaign_dispatch_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "configId" UUID NOT NULL,
    "templateName" TEXT NOT NULL,
    "templateLang" TEXT NOT NULL DEFAULT 'pt_BR',
    "variables" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isRemainder" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "whatsapp_campaign_dispatch_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_campaign_recipients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dispatchGroupId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "leadId" UUID,
    "variantId" UUID,
    "phone" TEXT NOT NULL,
    "normalizedPhone" TEXT NOT NULL,
    "variables" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "metaWamid" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "respondedAt" TIMESTAMP(3),
    "exclusionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_campaign_recipients_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wamid" TEXT NOT NULL,
    "leadId" UUID NOT NULL,
    "instanceId" UUID NOT NULL,
    "conversation_uuid" UUID,
    "ticketId" UUID,
    "campaignRecipientId" UUID,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "body" TEXT,
    "mediaUrl" TEXT,
    "status" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "conversationId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'live',
    "rawMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
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
    "projectId" UUID NOT NULL,
    "connectionId" UUID NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "adAccountName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_ad_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_pixels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT,
    "pixelId" TEXT NOT NULL,
    "capiToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_pixels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_conversion_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
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

-- CreateTable
CREATE TABLE "org_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID,
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

-- CreateTable
CREATE TABLE "billing_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "offerId" UUID,
    "asaasId" TEXT,
    "asaasCustomerId" TEXT,
    "pixAutomaticAuthId" TEXT,
    "status" "BillingSubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "paymentMethod" "BillingPaymentMethod",
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "failureReason" "BillingFailureReason",
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastFailureAt" TIMESTAMP(3),
    "lastFailureMessage" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "lastRetryAt" TIMESTAMP(3),
    "failureNotificationSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cycle" "BillingCycle" NOT NULL,
    "accessDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "includedProjects" INTEGER NOT NULL DEFAULT 0,
    "includedWhatsAppPerProject" INTEGER NOT NULL DEFAULT 0,
    "includedMetaAdAccountsPerProject" INTEGER NOT NULL DEFAULT 0,
    "includedConversionsPerProject" INTEGER NOT NULL DEFAULT 0,
    "supportLevel" TEXT NOT NULL DEFAULT 'standard',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
    "contactSalesOnly" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,

    CONSTRAINT "billing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "planId" UUID NOT NULL,
    "paymentMethod" "BillingPaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "maxInstallments" INTEGER NOT NULL DEFAULT 1,
    "installmentRate" DECIMAL(6,4),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "subscriptionId" UUID,
    "offerId" UUID,
    "asaasId" TEXT NOT NULL,
    "status" "BillingInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "BillingPaymentMethod" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "netValue" DOUBLE PRECISION,
    "description" TEXT,
    "billingType" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "invoiceUrl" TEXT,
    "bankSlipUrl" TEXT,
    "pixQrCode" TEXT,
    "pixQrCodePayload" TEXT,
    "pixQrCodeImage" TEXT,
    "pixExpirationDate" TIMESTAMP(3),
    "pixEmailSentAt" TIMESTAMP(3),
    "pixWhatsappSentAt" TIMESTAMP(3),
    "pixResendCount" INTEGER NOT NULL DEFAULT 0,
    "pixLastResendAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID,
    "userId" UUID,
    "actor" "AuditActor" NOT NULL DEFAULT 'SYSTEM',
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "asaasEventId" TEXT,
    "asaasPaymentId" TEXT,
    "previousState" JSONB,
    "newState" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_template_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wamid" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "organizationId" UUID NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),

    CONSTRAINT "whatsapp_template_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_user_roles_name_key" ON "auth_user_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "org_onboarding_statuses_name_key" ON "org_onboarding_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "crm_sale_statuses_name_key" ON "crm_sale_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_onboarding_statuses_name_key" ON "whatsapp_onboarding_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connection_statuses_name_key" ON "whatsapp_connection_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_health_statuses_name_key" ON "whatsapp_health_statuses"("name");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_audit_actions_name_key" ON "whatsapp_audit_actions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "auth_user_email_key" ON "auth_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_user_phone_key" ON "auth_user"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "auth_session_token_key" ON "auth_session"("token");

-- CreateIndex
CREATE INDEX "auth_session_userId_idx" ON "auth_session"("userId");

-- CreateIndex
CREATE INDEX "auth_account_userId_idx" ON "auth_account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_account_providerId_accountId_key" ON "auth_account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_ticket_tracking_ticketId_key" ON "crm_ticket_tracking"("ticketId");

-- CreateIndex
CREATE INDEX "crm_ticket_tracking_utmSource_idx" ON "crm_ticket_tracking"("utmSource");

-- CreateIndex
CREATE INDEX "crm_ticket_tracking_sourceType_idx" ON "crm_ticket_tracking"("sourceType");

-- CreateIndex
CREATE INDEX "crm_ticket_tracking_ctwaclid_idx" ON "crm_ticket_tracking"("ctwaclid");

-- CreateIndex
CREATE INDEX "crm_ticket_tracking_metaAdId_idx" ON "crm_ticket_tracking"("metaAdId");

-- CreateIndex
CREATE UNIQUE INDEX "org_organizations_slug_key" ON "org_organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "org_organizations_asaasCustomerId_key" ON "org_organizations"("asaasCustomerId");

-- CreateIndex
CREATE INDEX "crm_projects_organizationId_idx" ON "crm_projects"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_projects_organizationId_slug_key" ON "crm_projects"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "org_profiles_organizationId_key" ON "org_profiles"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "org_profiles_cpf_key" ON "org_profiles"("cpf");

-- CreateIndex
CREATE INDEX "org_members_organizationId_role_idx" ON "org_members"("organizationId", "role");

-- CreateIndex
CREATE INDEX "org_roles_organizationId_idx" ON "org_roles"("organizationId");

-- CreateIndex
CREATE INDEX "org_roles_isSystem_idx" ON "org_roles"("isSystem");

-- CreateIndex
CREATE UNIQUE INDEX "org_roles_organizationId_key_key" ON "org_roles"("organizationId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "org_roles_organizationId_name_key" ON "org_roles"("organizationId", "name");

-- CreateIndex
CREATE INDEX "org_role_permissions_organizationRoleId_idx" ON "org_role_permissions"("organizationRoleId");

-- CreateIndex
CREATE INDEX "org_role_permissions_permissionKey_idx" ON "org_role_permissions"("permissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "org_role_permissions_organizationRoleId_permissionKey_key" ON "org_role_permissions"("organizationRoleId", "permissionKey");

-- CreateIndex
CREATE INDEX "org_member_permission_overrides_memberId_idx" ON "org_member_permission_overrides"("memberId");

-- CreateIndex
CREATE INDEX "org_member_permission_overrides_permissionKey_idx" ON "org_member_permission_overrides"("permissionKey");

-- CreateIndex
CREATE INDEX "org_member_permission_overrides_effect_idx" ON "org_member_permission_overrides"("effect");

-- CreateIndex
CREATE UNIQUE INDEX "org_member_permission_overrides_memberId_permissionKey_key" ON "org_member_permission_overrides"("memberId", "permissionKey");

-- CreateIndex
CREATE INDEX "crm_leads_organizationId_idx" ON "crm_leads"("organizationId");

-- CreateIndex
CREATE INDEX "crm_leads_projectId_idx" ON "crm_leads"("projectId");

-- CreateIndex
CREATE INDEX "crm_leads_organizationId_projectId_idx" ON "crm_leads"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "crm_leads_source_idx" ON "crm_leads"("source");

-- CreateIndex
CREATE INDEX "crm_leads_isActive_idx" ON "crm_leads"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "crm_leads_organizationId_phone_key" ON "crm_leads"("organizationId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "crm_leads_organizationId_remote_jid_key" ON "crm_leads"("organizationId", "remote_jid");

-- CreateIndex
CREATE INDEX "crm_conversations_organizationId_idx" ON "crm_conversations"("organizationId");

-- CreateIndex
CREATE INDEX "crm_conversations_projectId_idx" ON "crm_conversations"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_conversations_leadId_instanceId_key" ON "crm_conversations"("leadId", "instanceId");

-- CreateIndex
CREATE INDEX "crm_tickets_organizationId_idx" ON "crm_tickets"("organizationId");

-- CreateIndex
CREATE INDEX "crm_tickets_projectId_idx" ON "crm_tickets"("projectId");

-- CreateIndex
CREATE INDEX "crm_tickets_organizationId_projectId_idx" ON "crm_tickets"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "crm_tickets_conversationId_idx" ON "crm_tickets"("conversationId");

-- CreateIndex
CREATE INDEX "crm_tickets_status_idx" ON "crm_tickets"("status");

-- CreateIndex
CREATE INDEX "crm_tickets_stageId_idx" ON "crm_tickets"("stageId");

-- CreateIndex
CREATE INDEX "crm_ticket_stages_organizationId_projectId_order_idx" ON "crm_ticket_stages"("organizationId", "projectId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "crm_ticket_stages_organizationId_projectId_name_key" ON "crm_ticket_stages"("organizationId", "projectId", "name");

-- CreateIndex
CREATE INDEX "crm_sales_organizationId_idx" ON "crm_sales"("organizationId");

-- CreateIndex
CREATE INDEX "crm_sales_projectId_idx" ON "crm_sales"("projectId");

-- CreateIndex
CREATE INDEX "crm_sales_organizationId_projectId_idx" ON "crm_sales"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "crm_sales_createdAt_idx" ON "crm_sales"("createdAt");

-- CreateIndex
CREATE INDEX "crm_sales_ticketId_idx" ON "crm_sales"("ticketId");

-- CreateIndex
CREATE INDEX "crm_sale_items_organizationId_idx" ON "crm_sale_items"("organizationId");

-- CreateIndex
CREATE INDEX "crm_sale_items_saleId_idx" ON "crm_sale_items"("saleId");

-- CreateIndex
CREATE INDEX "crm_sale_items_itemId_idx" ON "crm_sale_items"("itemId");

-- CreateIndex
CREATE INDEX "crm_items_organizationId_idx" ON "crm_items"("organizationId");

-- CreateIndex
CREATE INDEX "crm_items_projectId_idx" ON "crm_items"("projectId");

-- CreateIndex
CREATE INDEX "crm_items_organizationId_projectId_idx" ON "crm_items"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "crm_items_active_idx" ON "crm_items"("active");

-- CreateIndex
CREATE UNIQUE INDEX "crm_items_organizationId_name_key" ON "crm_items"("organizationId", "name");

-- CreateIndex
CREATE INDEX "crm_item_categories_organizationId_idx" ON "crm_item_categories"("organizationId");

-- CreateIndex
CREATE INDEX "crm_item_categories_projectId_idx" ON "crm_item_categories"("projectId");

-- CreateIndex
CREATE INDEX "crm_item_categories_organizationId_projectId_idx" ON "crm_item_categories"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "crm_item_categories_active_idx" ON "crm_item_categories"("active");

-- CreateIndex
CREATE UNIQUE INDEX "crm_item_categories_organizationId_name_key" ON "crm_item_categories"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "org_companies_organizationId_key" ON "org_companies"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "org_companies_cnpj_key" ON "org_companies"("cnpj");

-- CreateIndex
CREATE INDEX "org_companies_cnaeCode_idx" ON "org_companies"("cnaeCode");

-- CreateIndex
CREATE INDEX "org_companies_porte_idx" ON "org_companies"("porte");

-- CreateIndex
CREATE INDEX "org_companies_uf_idx" ON "org_companies"("uf");

-- CreateIndex
CREATE INDEX "org_companies_situacao_idx" ON "org_companies"("situacao");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_configs_phoneId_key" ON "whatsapp_configs"("phoneId");

-- CreateIndex
CREATE INDEX "whatsapp_configs_connectionId_idx" ON "whatsapp_configs"("connectionId");

-- CreateIndex
CREATE INDEX "whatsapp_configs_projectId_idx" ON "whatsapp_configs"("projectId");

-- CreateIndex
CREATE INDEX "whatsapp_configs_organizationId_projectId_idx" ON "whatsapp_configs"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "whatsapp_configs_processed_idx" ON "whatsapp_configs"("processed");

-- CreateIndex
CREATE INDEX "whatsapp_configs_historySyncStatus_idx" ON "whatsapp_configs"("historySyncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_onboarding_trackingCode_key" ON "whatsapp_onboarding"("trackingCode");

-- CreateIndex
CREATE INDEX "whatsapp_onboarding_projectId_idx" ON "whatsapp_onboarding"("projectId");

-- CreateIndex
CREATE INDEX "whatsapp_onboarding_organizationId_projectId_idx" ON "whatsapp_onboarding"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "whatsapp_onboarding_organizationId_idx" ON "whatsapp_onboarding"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_onboarding_trackingCode_idx" ON "whatsapp_onboarding"("trackingCode");

-- CreateIndex
CREATE INDEX "whatsapp_onboarding_status_idx" ON "whatsapp_onboarding"("status");

-- CreateIndex
CREATE INDEX "whatsapp_onboarding_expiresAt_idx" ON "whatsapp_onboarding"("expiresAt");

-- CreateIndex
CREATE INDEX "whatsapp_connections_projectId_idx" ON "whatsapp_connections"("projectId");

-- CreateIndex
CREATE INDEX "whatsapp_connections_organizationId_projectId_idx" ON "whatsapp_connections"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "whatsapp_connections_status_idx" ON "whatsapp_connections"("status");

-- CreateIndex
CREATE INDEX "whatsapp_connections_phoneNumberId_idx" ON "whatsapp_connections"("phoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connections_projectId_wabaId_key" ON "whatsapp_connections"("projectId", "wabaId");

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
CREATE INDEX "whatsapp_campaigns_organizationId_idx" ON "whatsapp_campaigns"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_campaigns_projectId_idx" ON "whatsapp_campaigns"("projectId");

-- CreateIndex
CREATE INDEX "whatsapp_campaigns_organizationId_projectId_idx" ON "whatsapp_campaigns"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "whatsapp_campaigns_status_idx" ON "whatsapp_campaigns"("status");

-- CreateIndex
CREATE INDEX "whatsapp_campaigns_scheduledAt_idx" ON "whatsapp_campaigns"("scheduledAt");

-- CreateIndex
CREATE INDEX "crm_lead_tags_organizationId_idx" ON "crm_lead_tags"("organizationId");

-- CreateIndex
CREATE INDEX "crm_lead_tags_projectId_idx" ON "crm_lead_tags"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_lead_tags_organizationId_projectId_name_key" ON "crm_lead_tags"("organizationId", "projectId", "name");

-- CreateIndex
CREATE INDEX "crm_lead_tag_assignments_leadId_idx" ON "crm_lead_tag_assignments"("leadId");

-- CreateIndex
CREATE INDEX "crm_lead_tag_assignments_tagId_idx" ON "crm_lead_tag_assignments"("tagId");

-- CreateIndex
CREATE INDEX "whatsapp_contact_lists_organizationId_idx" ON "whatsapp_contact_lists"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_contact_lists_projectId_idx" ON "whatsapp_contact_lists"("projectId");

-- CreateIndex
CREATE INDEX "whatsapp_contact_list_members_listId_idx" ON "whatsapp_contact_list_members"("listId");

-- CreateIndex
CREATE INDEX "whatsapp_contact_list_members_normalizedPhone_idx" ON "whatsapp_contact_list_members"("normalizedPhone");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_contact_list_members_listId_normalizedPhone_key" ON "whatsapp_contact_list_members"("listId", "normalizedPhone");

-- CreateIndex
CREATE INDEX "whatsapp_audience_segments_organizationId_idx" ON "whatsapp_audience_segments"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_audience_segments_projectId_idx" ON "whatsapp_audience_segments"("projectId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_events_campaignId_idx" ON "whatsapp_campaign_events"("campaignId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_events_type_idx" ON "whatsapp_campaign_events"("type");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_campaign_variants_dispatchGroupId_key" ON "whatsapp_campaign_variants"("dispatchGroupId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_variants_campaignId_idx" ON "whatsapp_campaign_variants"("campaignId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_dispatch_groups_campaignId_idx" ON "whatsapp_campaign_dispatch_groups"("campaignId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_dispatch_groups_configId_idx" ON "whatsapp_campaign_dispatch_groups"("configId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_dispatch_groups_status_idx" ON "whatsapp_campaign_dispatch_groups"("status");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_recipients_campaignId_idx" ON "whatsapp_campaign_recipients"("campaignId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_recipients_dispatchGroupId_idx" ON "whatsapp_campaign_recipients"("dispatchGroupId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_recipients_leadId_idx" ON "whatsapp_campaign_recipients"("leadId");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_recipients_phone_idx" ON "whatsapp_campaign_recipients"("phone");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_recipients_normalizedPhone_idx" ON "whatsapp_campaign_recipients"("normalizedPhone");

-- CreateIndex
CREATE INDEX "whatsapp_campaign_recipients_status_idx" ON "whatsapp_campaign_recipients"("status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_campaign_recipients_campaignId_normalizedPhone_key" ON "whatsapp_campaign_recipients"("campaignId", "normalizedPhone");

-- CreateIndex
CREATE INDEX "whatsapp_opt_outs_organizationId_idx" ON "whatsapp_opt_outs"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_opt_outs_organizationId_createdAt_idx" ON "whatsapp_opt_outs"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_opt_outs_organizationId_phone_key" ON "whatsapp_opt_outs"("organizationId", "phone");

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

-- CreateIndex
CREATE INDEX "whatsapp_messages_source_idx" ON "whatsapp_messages"("source");

-- CreateIndex
CREATE INDEX "whatsapp_messages_timestamp_idx" ON "whatsapp_messages"("timestamp");

-- CreateIndex
CREATE INDEX "whatsapp_messages_campaignRecipientId_idx" ON "whatsapp_messages"("campaignRecipientId");

-- CreateIndex
CREATE INDEX "meta_connections_organizationId_projectId_idx" ON "meta_connections"("organizationId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_connections_projectId_fbUserId_key" ON "meta_connections"("projectId", "fbUserId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_connections_organizationId_fbUserId_key" ON "meta_connections"("organizationId", "fbUserId");

-- CreateIndex
CREATE INDEX "meta_ad_accounts_projectId_idx" ON "meta_ad_accounts"("projectId");

-- CreateIndex
CREATE INDEX "meta_ad_accounts_organizationId_projectId_idx" ON "meta_ad_accounts"("organizationId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_ad_accounts_projectId_adAccountId_key" ON "meta_ad_accounts"("projectId", "adAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_ad_accounts_organizationId_adAccountId_key" ON "meta_ad_accounts"("organizationId", "adAccountId");

-- CreateIndex
CREATE INDEX "meta_pixels_projectId_idx" ON "meta_pixels"("projectId");

-- CreateIndex
CREATE INDEX "meta_pixels_organizationId_projectId_idx" ON "meta_pixels"("organizationId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_pixels_projectId_pixelId_key" ON "meta_pixels"("projectId", "pixelId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_pixels_organizationId_pixelId_key" ON "meta_pixels"("organizationId", "pixelId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_conversion_events_eventId_key" ON "meta_conversion_events"("eventId");

-- CreateIndex
CREATE INDEX "meta_conversion_events_projectId_idx" ON "meta_conversion_events"("projectId");

-- CreateIndex
CREATE INDEX "meta_conversion_events_organizationId_projectId_idx" ON "meta_conversion_events"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "meta_conversion_events_organizationId_idx" ON "meta_conversion_events"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_conversion_events_ticketId_eventName_key" ON "meta_conversion_events"("ticketId", "eventName");

-- CreateIndex
CREATE INDEX "meta_attribution_history_ticketId_idx" ON "meta_attribution_history"("ticketId");

-- CreateIndex
CREATE INDEX "org_audit_logs_organizationId_idx" ON "org_audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "org_audit_logs_userId_idx" ON "org_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "org_audit_logs_createdAt_idx" ON "org_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "org_audit_logs_requestId_idx" ON "org_audit_logs"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_subscriptions_organizationId_key" ON "billing_subscriptions"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_subscriptions_asaasId_key" ON "billing_subscriptions"("asaasId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_subscriptions_pixAutomaticAuthId_key" ON "billing_subscriptions"("pixAutomaticAuthId");

-- CreateIndex
CREATE INDEX "billing_subscriptions_organizationId_idx" ON "billing_subscriptions"("organizationId");

-- CreateIndex
CREATE INDEX "billing_subscriptions_offerId_idx" ON "billing_subscriptions"("offerId");

-- CreateIndex
CREATE INDEX "billing_subscriptions_asaasId_idx" ON "billing_subscriptions"("asaasId");

-- CreateIndex
CREATE INDEX "billing_subscriptions_status_idx" ON "billing_subscriptions"("status");

-- CreateIndex
CREATE INDEX "billing_subscriptions_isActive_idx" ON "billing_subscriptions"("isActive");

-- CreateIndex
CREATE INDEX "billing_subscriptions_expiresAt_idx" ON "billing_subscriptions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "billing_plans_code_key" ON "billing_plans"("code");

-- CreateIndex
CREATE INDEX "billing_plans_isActive_idx" ON "billing_plans"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "billing_offers_code_key" ON "billing_offers"("code");

-- CreateIndex
CREATE INDEX "billing_offers_planId_idx" ON "billing_offers"("planId");

-- CreateIndex
CREATE INDEX "billing_offers_planId_paymentMethod_isActive_idx" ON "billing_offers"("planId", "paymentMethod", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoices_asaasId_key" ON "billing_invoices"("asaasId");

-- CreateIndex
CREATE INDEX "billing_invoices_organizationId_idx" ON "billing_invoices"("organizationId");

-- CreateIndex
CREATE INDEX "billing_invoices_subscriptionId_idx" ON "billing_invoices"("subscriptionId");

-- CreateIndex
CREATE INDEX "billing_invoices_offerId_idx" ON "billing_invoices"("offerId");

-- CreateIndex
CREATE INDEX "billing_invoices_asaasId_idx" ON "billing_invoices"("asaasId");

-- CreateIndex
CREATE INDEX "billing_invoices_status_idx" ON "billing_invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_audit_logs_asaasEventId_key" ON "billing_audit_logs"("asaasEventId");

-- CreateIndex
CREATE INDEX "billing_audit_logs_organizationId_idx" ON "billing_audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "billing_audit_logs_userId_idx" ON "billing_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "billing_audit_logs_action_idx" ON "billing_audit_logs"("action");

-- CreateIndex
CREATE INDEX "billing_audit_logs_entity_entityId_idx" ON "billing_audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "billing_audit_logs_asaasEventId_idx" ON "billing_audit_logs"("asaasEventId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_template_logs_wamid_key" ON "whatsapp_template_logs"("wamid");

-- CreateIndex
CREATE INDEX "whatsapp_template_logs_organizationId_templateName_idx" ON "whatsapp_template_logs"("organizationId", "templateName");

-- CreateIndex
CREATE INDEX "whatsapp_template_logs_organizationId_sentAt_idx" ON "whatsapp_template_logs"("organizationId", "sentAt");

-- AddForeignKey
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_ticket_tracking" ADD CONSTRAINT "crm_ticket_tracking_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "crm_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_projects" ADD CONSTRAINT "crm_projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_profiles" ADD CONSTRAINT "org_profiles_onboardingStatus_fkey" FOREIGN KEY ("onboardingStatus") REFERENCES "org_onboarding_statuses"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_profiles" ADD CONSTRAINT "org_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_roles" ADD CONSTRAINT "org_roles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_role_permissions" ADD CONSTRAINT "org_role_permissions_organizationRoleId_fkey" FOREIGN KEY ("organizationRoleId") REFERENCES "org_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_member_permission_overrides" ADD CONSTRAINT "org_member_permission_overrides_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "org_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_invitations" ADD CONSTRAINT "org_invitations_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_invitations" ADD CONSTRAINT "org_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "crm_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_conversations" ADD CONSTRAINT "crm_conversations_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "whatsapp_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_conversations" ADD CONSTRAINT "crm_conversations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_conversations" ADD CONSTRAINT "crm_conversations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tickets" ADD CONSTRAINT "crm_tickets_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "auth_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tickets" ADD CONSTRAINT "crm_tickets_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "crm_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tickets" ADD CONSTRAINT "crm_tickets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tickets" ADD CONSTRAINT "crm_tickets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "crm_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tickets" ADD CONSTRAINT "crm_tickets_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "crm_ticket_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_ticket_stages" ADD CONSTRAINT "crm_ticket_stages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_sales" ADD CONSTRAINT "crm_sales_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_sales" ADD CONSTRAINT "crm_sales_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "crm_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_sales" ADD CONSTRAINT "crm_sales_status_fkey" FOREIGN KEY ("status") REFERENCES "crm_sale_statuses"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_sales" ADD CONSTRAINT "crm_sales_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "crm_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_sale_items" ADD CONSTRAINT "crm_sale_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_sale_items" ADD CONSTRAINT "crm_sale_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "crm_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_sale_items" ADD CONSTRAINT "crm_sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "crm_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_items" ADD CONSTRAINT "crm_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "crm_item_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_items" ADD CONSTRAINT "crm_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_items" ADD CONSTRAINT "crm_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "crm_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_item_categories" ADD CONSTRAINT "crm_item_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_item_categories" ADD CONSTRAINT "crm_item_categories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "crm_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_companies" ADD CONSTRAINT "org_companies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_configs" ADD CONSTRAINT "whatsapp_configs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_configs" ADD CONSTRAINT "whatsapp_configs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_configs" ADD CONSTRAINT "whatsapp_configs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "crm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_onboarding" ADD CONSTRAINT "whatsapp_onboarding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_onboarding" ADD CONSTRAINT "whatsapp_onboarding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "crm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_onboarding" ADD CONSTRAINT "whatsapp_onboarding_status_fkey" FOREIGN KEY ("status") REFERENCES "whatsapp_onboarding_statuses"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_healthStatus_fkey" FOREIGN KEY ("healthStatus") REFERENCES "whatsapp_health_statuses"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "crm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_status_fkey" FOREIGN KEY ("status") REFERENCES "whatsapp_connection_statuses"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_health" ADD CONSTRAINT "whatsapp_health_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_health" ADD CONSTRAINT "whatsapp_health_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_health" ADD CONSTRAINT "whatsapp_health_status_fkey" FOREIGN KEY ("status") REFERENCES "whatsapp_health_statuses"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_webhook_logs" ADD CONSTRAINT "whatsapp_webhook_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_audit_logs" ADD CONSTRAINT "whatsapp_audit_logs_action_fkey" FOREIGN KEY ("action") REFERENCES "whatsapp_audit_actions"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_audit_logs" ADD CONSTRAINT "whatsapp_audit_logs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "whatsapp_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_audit_logs" ADD CONSTRAINT "whatsapp_audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaigns" ADD CONSTRAINT "whatsapp_campaigns_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaigns" ADD CONSTRAINT "whatsapp_campaigns_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "crm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaigns" ADD CONSTRAINT "whatsapp_campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "auth_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaigns" ADD CONSTRAINT "whatsapp_campaigns_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "auth_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_lead_tags" ADD CONSTRAINT "crm_lead_tags_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_lead_tag_assignments" ADD CONSTRAINT "crm_lead_tag_assignments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_lead_tag_assignments" ADD CONSTRAINT "crm_lead_tag_assignments_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "crm_lead_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contact_lists" ADD CONSTRAINT "whatsapp_contact_lists_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contact_list_members" ADD CONSTRAINT "whatsapp_contact_list_members_listId_fkey" FOREIGN KEY ("listId") REFERENCES "whatsapp_contact_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_audience_segments" ADD CONSTRAINT "whatsapp_audience_segments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_audience_segments" ADD CONSTRAINT "whatsapp_audience_segments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "crm_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_events" ADD CONSTRAINT "whatsapp_campaign_events_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "whatsapp_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_variants" ADD CONSTRAINT "whatsapp_campaign_variants_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "whatsapp_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_variants" ADD CONSTRAINT "whatsapp_campaign_variants_dispatchGroupId_fkey" FOREIGN KEY ("dispatchGroupId") REFERENCES "whatsapp_campaign_dispatch_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_dispatch_groups" ADD CONSTRAINT "whatsapp_campaign_dispatch_groups_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "whatsapp_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_dispatch_groups" ADD CONSTRAINT "whatsapp_campaign_dispatch_groups_configId_fkey" FOREIGN KEY ("configId") REFERENCES "whatsapp_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_recipients" ADD CONSTRAINT "whatsapp_campaign_recipients_dispatchGroupId_fkey" FOREIGN KEY ("dispatchGroupId") REFERENCES "whatsapp_campaign_dispatch_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_recipients" ADD CONSTRAINT "whatsapp_campaign_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "whatsapp_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_recipients" ADD CONSTRAINT "whatsapp_campaign_recipients_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_campaign_recipients" ADD CONSTRAINT "whatsapp_campaign_recipients_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "whatsapp_campaign_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_opt_outs" ADD CONSTRAINT "whatsapp_opt_outs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_opt_outs" ADD CONSTRAINT "whatsapp_opt_outs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "whatsapp_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_conversation_uuid_fkey" FOREIGN KEY ("conversation_uuid") REFERENCES "crm_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "whatsapp_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "crm_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_campaignRecipientId_fkey" FOREIGN KEY ("campaignRecipientId") REFERENCES "whatsapp_campaign_recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_connections" ADD CONSTRAINT "meta_connections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_connections" ADD CONSTRAINT "meta_connections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "crm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_ad_accounts" ADD CONSTRAINT "meta_ad_accounts_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "meta_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_ad_accounts" ADD CONSTRAINT "meta_ad_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_ad_accounts" ADD CONSTRAINT "meta_ad_accounts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "crm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_pixels" ADD CONSTRAINT "meta_pixels_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_pixels" ADD CONSTRAINT "meta_pixels_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "crm_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_conversion_events" ADD CONSTRAINT "meta_conversion_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_conversion_events" ADD CONSTRAINT "meta_conversion_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "crm_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_attribution_history" ADD CONSTRAINT "meta_attribution_history_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "crm_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_audit_logs" ADD CONSTRAINT "org_audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_audit_logs" ADD CONSTRAINT "org_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "billing_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_offers" ADD CONSTRAINT "billing_offers_planId_fkey" FOREIGN KEY ("planId") REFERENCES "billing_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "billing_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "billing_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_audit_logs" ADD CONSTRAINT "billing_audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "org_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_audit_logs" ADD CONSTRAINT "billing_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
