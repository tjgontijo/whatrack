/**
 * Chat Types
 *
 * Type definitions for chat components and hooks
 */

// Conversation status enum
export type ConversationStatus = "OPEN" | "PENDING" | "RESOLVED" | "SNOOZED";

// Priority enum
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

// Sender type enum
export type SenderType = "CONTACT" | "USER" | "AI_AGENT" | "SYSTEM";

// Message type enum
export type MessageType =
  | "TEXT"
  | "IMAGE"
  | "VIDEO"
  | "AUDIO"
  | "DOCUMENT"
  | "STICKER"
  | "LOCATION"
  | "CONTACT_CARD"
  | "TEMPLATE"
  | "INTERACTIVE"
  | "ACTIVITY";

// Message status enum
export type MessageStatus = "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";

// Instance info (minimal)
export interface InstanceInfo {
  id: string;
  label?: string | null;
  phone?: string | null;
  status?: string;
}

// Contact info (minimal)
export interface ContactInfo {
  id: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
}

// Last message preview
export interface LastMessagePreview {
  id: string;
  content: string | null;
  senderType: SenderType;
  sentAt: string;
}

// Conversation list item (from GET /api/conversations)
export interface ConversationListItem {
  id: string;
  threadId: string;
  status: ConversationStatus;
  priority: Priority;
  assigneeType: string | null;
  assigneeId: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  instance: InstanceInfo;
  contact: ContactInfo;
  lastMessage: LastMessagePreview | null;
  unreadCount?: number;
}

// Message (from GET /api/conversations/[id]/messages)
export interface Message {
  id: string;
  content: string | null;
  senderType: SenderType;
  senderId: string | null;
  senderName: string | null;
  messageType: MessageType;
  mediaUrl: string | null;
  mediaType: string | null;
  fileName: string | null;
  status: MessageStatus;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
}

// Conversation detail (from GET /api/conversations/[id])
export interface ConversationDetail {
  id: string;
  threadId: string;
  status: ConversationStatus;
  priority: Priority;
  assigneeType: string | null;
  assigneeId: string | null;
  lastMessageAt: string | null;
  firstReplyAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  instance: InstanceInfo;
  contact: ContactInfo;
  messages: Message[];
}

// Messages response (from GET /api/conversations/[id]/messages)
export interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

// Update conversation request (for PATCH /api/conversations/[id])
export interface UpdateConversationRequest {
  status?: ConversationStatus;
  priority?: Priority;
  assigneeType?: string;
  assigneeId?: string;
}

// Send message request (for POST /api/conversations/[id]/messages)
export interface SendMessageRequest {
  content: string;
}

// Conversation filters
export interface ConversationFilters {
  status?: ConversationStatus;
  instanceId?: string;
}
