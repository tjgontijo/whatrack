/**
 * Chat API Client
 *
 * Functions for interacting with the chat API endpoints
 */

import type {
  ConversationListItem,
  ConversationDetail,
  MessagesResponse,
  Message,
  UpdateConversationRequest,
  SendMessageRequest,
  ConversationFilters,
} from "./types";

// Error handling helper
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `API error: ${response.status}`);
  }
  return response.json();
}

/**
 * List conversations with optional filters
 */
export async function listConversations(
  filters?: ConversationFilters
): Promise<ConversationListItem[]> {
  const params = new URLSearchParams();

  if (filters?.status) {
    params.set("status", filters.status);
  }
  if (filters?.instanceId) {
    params.set("instanceId", filters.instanceId);
  }

  const url = `/api/v1/chat/conversations${params.toString() ? `?${params}` : ""}`;
  const response = await fetch(url, { method: "GET" });

  return handleResponse<ConversationListItem[]>(response);
}

/**
 * Get a single conversation with details
 */
export async function getConversation(id: string): Promise<ConversationDetail> {
  const response = await fetch(`/api/v1/chat/conversations/${id}`, { method: "GET" });
  return handleResponse<ConversationDetail>(response);
}

/**
 * Update a conversation (status, priority, assignee)
 */
export async function updateConversation(
  id: string,
  data: UpdateConversationRequest
): Promise<ConversationDetail> {
  const response = await fetch(`/api/v1/chat/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return handleResponse<ConversationDetail>(response);
}

/**
 * List messages for a conversation with pagination
 */
export async function listMessages(
  conversationId: string,
  options?: { cursor?: string; limit?: number }
): Promise<MessagesResponse> {
  const params = new URLSearchParams();

  if (options?.cursor) {
    params.set("cursor", options.cursor);
  }
  if (options?.limit) {
    params.set("limit", String(options.limit));
  }

  const url = `/api/v1/chat/conversations/${conversationId}/messages${params.toString() ? `?${params}` : ""}`;
  const response = await fetch(url, { method: "GET" });

  return handleResponse<MessagesResponse>(response);
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: string,
  data: SendMessageRequest
): Promise<Message> {
  const response = await fetch(`/api/v1/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return handleResponse<Message>(response);
}
