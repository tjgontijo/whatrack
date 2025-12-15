/**
 * React Query hooks for Conversations/Chat API
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listConversations,
  getConversation,
  updateConversation,
  listMessages,
  sendMessage,
} from "@/lib/chat/api";
import type {
  ConversationFilters,
  UpdateConversationRequest,
  SendMessageRequest,
} from "@/lib/chat/types";

// Query keys for cache management
export const conversationsKeys = {
  all: ["conversations"] as const,
  lists: () => [...conversationsKeys.all, "list"] as const,
  list: (filters?: ConversationFilters) =>
    [...conversationsKeys.lists(), filters] as const,
  details: () => [...conversationsKeys.all, "detail"] as const,
  detail: (id: string) => [...conversationsKeys.details(), id] as const,
  messages: (conversationId: string) =>
    [...conversationsKeys.detail(conversationId), "messages"] as const,
};

/**
 * Fetch all conversations with optional filters
 */
export function useConversations(filters?: ConversationFilters) {
  return useQuery({
    queryKey: conversationsKeys.list(filters),
    queryFn: () => listConversations(filters),
  });
}

/**
 * Fetch a single conversation by ID
 */
export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: conversationsKeys.detail(id!),
    queryFn: () => getConversation(id!),
    enabled: !!id,
  });
}

/**
 * Update a conversation (status, priority, assignee)
 */
export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConversationRequest }) =>
      updateConversation(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: conversationsKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: conversationsKeys.detail(id),
      });
    },
  });
}

/**
 * Fetch messages for a conversation
 */
export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: conversationsKeys.messages(conversationId!),
    queryFn: () => listMessages(conversationId!),
    enabled: !!conversationId,
  });
}

/**
 * Send a message in a conversation
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      data,
    }: {
      conversationId: string;
      data: SendMessageRequest;
    }) => sendMessage(conversationId, data),
    onSuccess: (_, { conversationId }) => {
      // Invalidate messages to refresh the list
      void queryClient.invalidateQueries({
        queryKey: conversationsKeys.messages(conversationId),
      });
      // Invalidate conversation detail to update lastMessageAt
      void queryClient.invalidateQueries({
        queryKey: conversationsKeys.detail(conversationId),
      });
      // Invalidate conversations list to update order
      void queryClient.invalidateQueries({
        queryKey: conversationsKeys.lists(),
      });
    },
  });
}
