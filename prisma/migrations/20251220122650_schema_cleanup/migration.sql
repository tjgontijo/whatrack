/*
  Warnings:

  - You are about to drop the column `assignedTo` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `firstCampaign` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `firstMedium` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `firstSource` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `firstTicketId` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `instagram` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `leads` table. All the data in the column will be lost.
  - You are about to drop the column `conversationId` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `lastMessageAt` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `leadId` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the `conversation_metrics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `conversations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `whatsapp_message` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `messageType` on the `messages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `whatsappConversationId` to the `tickets` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "conversation_metrics" DROP CONSTRAINT "conversation_metrics_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_leadId_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_leadId_fkey";

-- DropForeignKey
ALTER TABLE "whatsapp_message" DROP CONSTRAINT "whatsapp_message_leadId_fkey";

-- DropForeignKey
ALTER TABLE "whatsapp_message" DROP CONSTRAINT "whatsapp_message_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "whatsapp_message" DROP CONSTRAINT "whatsapp_message_ticketId_fkey";

-- DropIndex
DROP INDEX "tickets_conversationId_idx";

-- DropIndex
DROP INDEX "tickets_lastMessageAt_idx";

-- DropIndex
DROP INDEX "tickets_leadId_idx";

-- AlterTable
ALTER TABLE "leads" DROP COLUMN "assignedTo",
DROP COLUMN "firstCampaign",
DROP COLUMN "firstMedium",
DROP COLUMN "firstSource",
DROP COLUMN "firstTicketId",
DROP COLUMN "instagram",
DROP COLUMN "notes",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "messageType",
ADD COLUMN     "messageType" "MessageType" NOT NULL;

-- AlterTable
ALTER TABLE "tickets" DROP COLUMN "conversationId",
DROP COLUMN "lastMessageAt",
DROP COLUMN "leadId",
ADD COLUMN     "whatsappConversationId" TEXT NOT NULL;

-- DropTable
DROP TABLE "conversation_metrics";

-- DropTable
DROP TABLE "conversations";

-- DropTable
DROP TABLE "whatsapp_message";

-- DropEnum
DROP TYPE "MessageDirection";

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
CREATE INDEX "messages_ticketId_sentAt_idx" ON "messages"("ticketId", "sentAt");

-- CreateIndex
CREATE INDEX "messages_ticketId_status_idx" ON "messages"("ticketId", "status");

-- CreateIndex
CREATE INDEX "messages_senderType_sentAt_idx" ON "messages"("senderType", "sentAt");

-- CreateIndex
CREATE INDEX "tickets_whatsappConversationId_idx" ON "tickets"("whatsappConversationId");

-- CreateIndex
CREATE INDEX "tickets_whatsappConversationId_status_idx" ON "tickets"("whatsappConversationId", "status");

-- CreateIndex
CREATE INDEX "tickets_organizationId_status_createdAt_idx" ON "tickets"("organizationId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_whatsappConversationId_fkey" FOREIGN KEY ("whatsappConversationId") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversation_metrics" ADD CONSTRAINT "whatsapp_conversation_metrics_whatsappConversationId_fkey" FOREIGN KEY ("whatsappConversationId") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
