-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('owner', 'admin', 'user');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'SNOOZED');

-- CreateEnum
CREATE TYPE "ConversationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MessageSenderType" AS ENUM ('LEAD', 'USER', 'AI', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "WhatsappProvider" AS ENUM ('WUZAPI', 'UAZAPI', 'META_CLOUD');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'RESOLVED', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "TicketSourceType" AS ENUM ('paid', 'organic');

-- CreateEnum
CREATE TYPE "SentimentType" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'FRUSTRATED');

-- CreateEnum
CREATE TYPE "TicketOutcome" AS ENUM ('SALE', 'LOST_PRICE', 'LOST_COMPETITOR', 'LOST_TIMING', 'LOST_NEED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('pending', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('scheduled', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('showed', 'no_show');

-- CreateEnum
CREATE TYPE "PlatformEventType" AS ENUM ('lead', 'contact', 'purchase', 'schedule', 'conversion');

-- CreateEnum
CREATE TYPE "PlatformEventStatus" AS ENUM ('sent', 'failed', 'pending');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('PURCHASE', 'CAMPAIGN_USE', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PlanInterval" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('incomplete', 'trialing', 'active', 'past_due', 'unpaid', 'canceled', 'paused');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'canceled');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('credit_card', 'debit_card', 'pix', 'boleto', 'bank_transfer', 'wallet');

-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('asaas', 'stripe', 'mercadopago', 'manual');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "emailVerified" BOOLEAN DEFAULT true,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "impersonatedBy" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeOrganizationId" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
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
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currentPlanId" TEXT,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "remote_jid" TEXT,
    "mail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_instances" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "token" TEXT,
    "label" TEXT,
    "phone" TEXT,
    "provider" "WhatsappProvider" NOT NULL DEFAULT 'WUZAPI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_instance_webhook" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "providerWebhookId" TEXT,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_instance_webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_conversations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "ConversationPriority" NOT NULL DEFAULT 'MEDIUM',
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_conversation_metrics" (
    "id" TEXT NOT NULL,
    "whatsappConversationId" TEXT NOT NULL,
    "leadAvgResponseTime" INTEGER,
    "agentAvgResponseTime" INTEGER,
    "leadMessages" INTEGER DEFAULT 0,
    "agentMessages" INTEGER DEFAULT 0,
    "totalMessages" INTEGER DEFAULT 0,
    "satisfactionScore" INTEGER,
    "satisfactionCount" INTEGER,
    "lastLeadMessageAt" TIMESTAMP(3),
    "lastAgentMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_conversation_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderType" "MessageSenderType" NOT NULL,
    "senderId" TEXT,
    "senderName" TEXT,
    "messageType" "MessageType" NOT NULL,
    "content" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "fileName" TEXT,
    "mediaSizeBytes" INTEGER,
    "mediaDurationSeconds" INTEGER,
    "providerMessageId" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "whatsappConversationId" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "assigneeId" TEXT,
    "assigneeName" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "followUpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "currentFollowUpStep" INTEGER,
    "gclid" TEXT,
    "fbclid" TEXT,
    "ctwaclid" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "campaign_id" TEXT,
    "adset_id" TEXT,
    "ad_id" TEXT,
    "sourceType" "TicketSourceType",
    "platformId" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_analyses" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "sentiment" "SentimentType",
    "sentimentScore" DOUBLE PRECISION,
    "buyingSignals" TEXT[],
    "objectionSignals" TEXT[],
    "aiLeadScore" INTEGER,
    "scoreFactors" JSONB,
    "summary" TEXT,
    "tags" TEXT[],
    "outcome" "TicketOutcome",
    "outcomeReason" TEXT,
    "analyzedAt" TIMESTAMP(3) NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "creditsUsed" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_messages" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "content" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "bullJobId" TEXT,
    "creditsUsed" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ticketId" TEXT,
    "totalAmount" DECIMAL(12,2),
    "profit" DECIMAL(12,2),
    "discount" DECIMAL(12,2),
    "status" "SaleStatus" DEFAULT 'pending',
    "notes" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT,
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
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
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
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ticketId" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_analytics" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ticketId" TEXT,
    "leadId" TEXT,
    "qualyAudit" TEXT,
    "timeAudit" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_ads_metrics" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "report_date" TIMESTAMP(3) NOT NULL,
    "campaign_name" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "adset_name" TEXT NOT NULL,
    "adset_id" TEXT NOT NULL,
    "ad_name" TEXT NOT NULL,
    "ad_id" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "results" INTEGER NOT NULL,
    "cost" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meta_ads_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ticketId" TEXT,
    "saleId" TEXT,
    "platform" TEXT NOT NULL,
    "eventType" "PlatformEventType" NOT NULL,
    "externalId" TEXT,
    "status" "PlatformEventStatus",
    "payload" JSONB,
    "response" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_credits" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "usedThisCycle" INTEGER NOT NULL DEFAULT 0,
    "lastCreditedAt" TIMESTAMP(3),
    "balanceAtCancellation" INTEGER,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "aiCreditsId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "creditsUsed" INTEGER NOT NULL,
    "ticketId" TEXT,
    "contactPhone" TEXT,
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER,
    "triggeredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "maxMetaProfiles" INTEGER NOT NULL DEFAULT 0,
    "maxMetaAdAccounts" INTEGER NOT NULL DEFAULT 0,
    "maxWhatsappInstances" INTEGER NOT NULL DEFAULT 1,
    "maxMembers" INTEGER NOT NULL DEFAULT 1,
    "maxLeadsPerMonth" INTEGER,
    "maxMessagesPerMonth" INTEGER,
    "messageRetentionDays" INTEGER,
    "maxMessagesStored" INTEGER,
    "aiCreditsQuota" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_prices" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "currency" TEXT NOT NULL,
    "interval" "PlanInterval" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "externalPriceId" TEXT,
    "externalProductId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_customers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "taxId" TEXT,
    "phone" TEXT,
    "address" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_customer_externals" (
    "id" TEXT NOT NULL,
    "billingCustomerId" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_customer_externals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods_stored" (
    "id" TEXT NOT NULL,
    "billingCustomerId" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "type" "PaymentMethod" NOT NULL,
    "lastFourDigits" TEXT,
    "brand" TEXT,
    "expiryMonth" INTEGER,
    "expiryYear" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_methods_stored_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "billingCustomerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "externalId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'incomplete',
    "interval" "PlanInterval" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "billingCustomerId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "provider" "BillingProvider" NOT NULL,
    "externalId" TEXT,
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "billingCustomerId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "provider" "BillingProvider" NOT NULL,
    "externalId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "method" "PaymentMethod",
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "pixQrCode" TEXT,
    "pixCopyPaste" TEXT,
    "pixExpiresAt" TIMESTAMP(3),
    "boletoUrl" TEXT,
    "boletoBarcode" TEXT,
    "boletoDueDate" TIMESTAMP(3),
    "cardLastFour" TEXT,
    "cardBrand" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_profiles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cpf" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
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
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
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
    "authorizedByUserId" TEXT NOT NULL,
    "authorizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "followup_configs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "businessHoursOnly" BOOLEAN NOT NULL DEFAULT true,
    "businessStartHour" INTEGER NOT NULL DEFAULT 9,
    "businessEndHour" INTEGER NOT NULL DEFAULT 18,
    "businessDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "aiTone" TEXT NOT NULL DEFAULT 'professional',
    "businessType" TEXT,
    "productDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "followup_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "followup_steps" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "delayMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "followup_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_metrics" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "ticketsOpened" INTEGER NOT NULL DEFAULT 0,
    "ticketsClosed" INTEGER NOT NULL DEFAULT 0,
    "ticketsWon" INTEGER NOT NULL DEFAULT 0,
    "ticketsLost" INTEGER NOT NULL DEFAULT 0,
    "ticketsAbandoned" INTEGER NOT NULL DEFAULT 0,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "salesRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lostByPrice" INTEGER NOT NULL DEFAULT 0,
    "lostByCompetitor" INTEGER NOT NULL DEFAULT 0,
    "lostByTiming" INTEGER NOT NULL DEFAULT 0,
    "lostByNeed" INTEGER NOT NULL DEFAULT 0,
    "newLeads" INTEGER NOT NULL DEFAULT 0,
    "returningLeads" INTEGER NOT NULL DEFAULT 0,
    "appointmentsCreated" INTEGER NOT NULL DEFAULT 0,
    "appointmentsShowed" INTEGER NOT NULL DEFAULT 0,
    "appointmentsNoShow" INTEGER NOT NULL DEFAULT 0,
    "messagesReceived" INTEGER NOT NULL DEFAULT 0,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTimeMs" INTEGER,
    "avgLeadScore" DOUBLE PRECISION,
    "avgSentimentScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_daily_metrics" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "ticketsAssigned" INTEGER NOT NULL DEFAULT 0,
    "ticketsClosed" INTEGER NOT NULL DEFAULT 0,
    "ticketsWon" INTEGER NOT NULL DEFAULT 0,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "salesRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTimeMs" INTEGER,
    "avgSentimentScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_daily_metrics_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "organization_currentPlanId_idx" ON "organization"("currentPlanId");

-- CreateIndex
CREATE INDEX "leads_organizationId_idx" ON "leads"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_organizationId_phone_key" ON "leads"("organizationId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "leads_organizationId_remote_jid_key" ON "leads"("organizationId", "remote_jid");

-- CreateIndex
CREATE INDEX "whatsapp_instances_organizationId_idx" ON "whatsapp_instances"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_instances_provider_idx" ON "whatsapp_instances"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_instances_organizationId_instanceId_key" ON "whatsapp_instances"("organizationId", "instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_instance_webhook_organizationId_instanceId_key" ON "whatsapp_instance_webhook"("organizationId", "instanceId");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_organizationId_idx" ON "whatsapp_conversations"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_instanceId_idx" ON "whatsapp_conversations"("instanceId");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_status_idx" ON "whatsapp_conversations"("status");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_organizationId_status_idx" ON "whatsapp_conversations"("organizationId", "status");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_organizationId_lastMessageAt_idx" ON "whatsapp_conversations"("organizationId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_instanceId_status_idx" ON "whatsapp_conversations"("instanceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_conversations_leadId_instanceId_key" ON "whatsapp_conversations"("leadId", "instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_conversation_metrics_whatsappConversationId_key" ON "whatsapp_conversation_metrics"("whatsappConversationId");

-- CreateIndex
CREATE INDEX "whatsapp_conversation_metrics_whatsappConversationId_idx" ON "whatsapp_conversation_metrics"("whatsappConversationId");

-- CreateIndex
CREATE UNIQUE INDEX "messages_providerMessageId_key" ON "messages"("providerMessageId");

-- CreateIndex
CREATE INDEX "messages_ticketId_idx" ON "messages"("ticketId");

-- CreateIndex
CREATE INDEX "messages_sentAt_idx" ON "messages"("sentAt");

-- CreateIndex
CREATE INDEX "messages_providerMessageId_idx" ON "messages"("providerMessageId");

-- CreateIndex
CREATE INDEX "messages_ticketId_sentAt_idx" ON "messages"("ticketId", "sentAt");

-- CreateIndex
CREATE INDEX "messages_ticketId_status_idx" ON "messages"("ticketId", "status");

-- CreateIndex
CREATE INDEX "messages_senderType_sentAt_idx" ON "messages"("senderType", "sentAt");

-- CreateIndex
CREATE INDEX "tickets_organizationId_idx" ON "tickets"("organizationId");

-- CreateIndex
CREATE INDEX "tickets_whatsappConversationId_idx" ON "tickets"("whatsappConversationId");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_assigneeId_idx" ON "tickets"("assigneeId");

-- CreateIndex
CREATE INDEX "tickets_sourceType_idx" ON "tickets"("sourceType");

-- CreateIndex
CREATE INDEX "tickets_campaign_id_idx" ON "tickets"("campaign_id");

-- CreateIndex
CREATE INDEX "tickets_adset_id_idx" ON "tickets"("adset_id");

-- CreateIndex
CREATE INDEX "tickets_ad_id_idx" ON "tickets"("ad_id");

-- CreateIndex
CREATE INDEX "tickets_whatsappConversationId_status_idx" ON "tickets"("whatsappConversationId", "status");

-- CreateIndex
CREATE INDEX "tickets_organizationId_status_createdAt_idx" ON "tickets"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_analyses_ticketId_key" ON "ticket_analyses"("ticketId");

-- CreateIndex
CREATE INDEX "scheduled_messages_ticketId_idx" ON "scheduled_messages"("ticketId");

-- CreateIndex
CREATE INDEX "scheduled_messages_organizationId_idx" ON "scheduled_messages"("organizationId");

-- CreateIndex
CREATE INDEX "scheduled_messages_scheduledAt_sentAt_idx" ON "scheduled_messages"("scheduledAt", "sentAt");

-- CreateIndex
CREATE INDEX "sales_organizationId_idx" ON "sales"("organizationId");

-- CreateIndex
CREATE INDEX "sales_ticketId_idx" ON "sales"("ticketId");

-- CreateIndex
CREATE INDEX "sales_createdAt_idx" ON "sales"("createdAt");

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
CREATE INDEX "appointments_organizationId_idx" ON "appointments"("organizationId");

-- CreateIndex
CREATE INDEX "appointments_ticketId_idx" ON "appointments"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_appointmentId_key" ON "attendance"("appointmentId");

-- CreateIndex
CREATE INDEX "attendance_organizationId_idx" ON "attendance"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_analytics_ticketId_key" ON "sales_analytics"("ticketId");

-- CreateIndex
CREATE INDEX "sales_analytics_organizationId_idx" ON "sales_analytics"("organizationId");

-- CreateIndex
CREATE INDEX "sales_analytics_ticketId_idx" ON "sales_analytics"("ticketId");

-- CreateIndex
CREATE INDEX "sales_analytics_leadId_idx" ON "sales_analytics"("leadId");

-- CreateIndex
CREATE INDEX "meta_ads_metrics_organizationId_idx" ON "meta_ads_metrics"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "meta_ads_metrics_organizationId_report_date_campaign_id_ads_key" ON "meta_ads_metrics"("organizationId", "report_date", "campaign_id", "adset_id", "ad_id");

-- CreateIndex
CREATE INDEX "platform_events_ticketId_idx" ON "platform_events"("ticketId");

-- CreateIndex
CREATE INDEX "platform_events_saleId_idx" ON "platform_events"("saleId");

-- CreateIndex
CREATE INDEX "platform_events_platform_idx" ON "platform_events"("platform");

-- CreateIndex
CREATE INDEX "platform_events_eventType_idx" ON "platform_events"("eventType");

-- CreateIndex
CREATE INDEX "platform_events_externalId_idx" ON "platform_events"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_credits_organizationId_key" ON "ai_credits"("organizationId");

-- CreateIndex
CREATE INDEX "ai_usage_logs_organizationId_createdAt_idx" ON "ai_usage_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_logs_aiCreditsId_idx" ON "ai_usage_logs"("aiCreditsId");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE INDEX "plan_prices_provider_idx" ON "plan_prices"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "plan_prices_planId_provider_currency_interval_key" ON "plan_prices"("planId", "provider", "currency", "interval");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_organizationId_key" ON "billing_customers"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customer_externals_billingCustomerId_provider_key" ON "billing_customer_externals"("billingCustomerId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customer_externals_provider_externalId_key" ON "billing_customer_externals"("provider", "externalId");

-- CreateIndex
CREATE INDEX "payment_methods_stored_billingCustomerId_idx" ON "payment_methods_stored"("billingCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_stored_provider_externalId_key" ON "payment_methods_stored"("provider", "externalId");

-- CreateIndex
CREATE INDEX "subscriptions_billingCustomerId_idx" ON "subscriptions"("billingCustomerId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_provider_externalId_key" ON "subscriptions"("provider", "externalId");

-- CreateIndex
CREATE INDEX "invoices_billingCustomerId_idx" ON "invoices"("billingCustomerId");

-- CreateIndex
CREATE INDEX "invoices_subscriptionId_idx" ON "invoices"("subscriptionId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_provider_externalId_key" ON "invoices"("provider", "externalId");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_billingCustomerId_idx" ON "payments"("billingCustomerId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_externalId_key" ON "payments"("provider", "externalId");

-- CreateIndex
CREATE INDEX "webhook_events_provider_eventType_idx" ON "webhook_events"("provider", "eventType");

-- CreateIndex
CREATE INDEX "webhook_events_processed_idx" ON "webhook_events"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_eventId_key" ON "webhook_events"("provider", "eventId");

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
CREATE UNIQUE INDEX "followup_configs_organizationId_key" ON "followup_configs"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "followup_steps_configId_order_key" ON "followup_steps"("configId", "order");

-- CreateIndex
CREATE INDEX "daily_metrics_organizationId_date_idx" ON "daily_metrics"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_metrics_organizationId_date_key" ON "daily_metrics"("organizationId", "date");

-- CreateIndex
CREATE INDEX "user_daily_metrics_organizationId_date_idx" ON "user_daily_metrics"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "user_daily_metrics_organizationId_userId_date_key" ON "user_daily_metrics"("organizationId", "userId", "date");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization" ADD CONSTRAINT "organization_currentPlanId_fkey" FOREIGN KEY ("currentPlanId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "whatsapp_instances" ADD CONSTRAINT "whatsapp_instances_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_instance_webhook" ADD CONSTRAINT "whatsapp_instance_webhook_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_instance_webhook" ADD CONSTRAINT "whatsapp_instance_webhook_organizationId_instanceId_fkey" FOREIGN KEY ("organizationId", "instanceId") REFERENCES "whatsapp_instances"("organizationId", "instanceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversation_metrics" ADD CONSTRAINT "whatsapp_conversation_metrics_whatsappConversationId_fkey" FOREIGN KEY ("whatsappConversationId") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_whatsappConversationId_fkey" FOREIGN KEY ("whatsappConversationId") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_analyses" ADD CONSTRAINT "ticket_analyses_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_analytics" ADD CONSTRAINT "sales_analytics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_analytics" ADD CONSTRAINT "sales_analytics_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_analytics" ADD CONSTRAINT "sales_analytics_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_ads_metrics" ADD CONSTRAINT "meta_ads_metrics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_events" ADD CONSTRAINT "platform_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_events" ADD CONSTRAINT "platform_events_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_events" ADD CONSTRAINT "platform_events_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_credits" ADD CONSTRAINT "ai_credits_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_aiCreditsId_fkey" FOREIGN KEY ("aiCreditsId") REFERENCES "ai_credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_customer_externals" ADD CONSTRAINT "billing_customer_externals_billingCustomerId_fkey" FOREIGN KEY ("billingCustomerId") REFERENCES "billing_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods_stored" ADD CONSTRAINT "payment_methods_stored_billingCustomerId_fkey" FOREIGN KEY ("billingCustomerId") REFERENCES "billing_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_billingCustomerId_fkey" FOREIGN KEY ("billingCustomerId") REFERENCES "billing_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_billingCustomerId_fkey" FOREIGN KEY ("billingCustomerId") REFERENCES "billing_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_billingCustomerId_fkey" FOREIGN KEY ("billingCustomerId") REFERENCES "billing_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_companies" ADD CONSTRAINT "organization_companies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followup_configs" ADD CONSTRAINT "followup_configs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followup_steps" ADD CONSTRAINT "followup_steps_configId_fkey" FOREIGN KEY ("configId") REFERENCES "followup_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_daily_metrics" ADD CONSTRAINT "user_daily_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
