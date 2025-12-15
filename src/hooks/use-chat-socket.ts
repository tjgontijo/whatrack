"use client";

import { useState, useCallback } from "react";

// TODO: PartySocket integration - module not yet implemented
// This is a stub implementation that returns empty state
// Full implementation will be added when PartySocket module is created

type InboxMessagePreview = any;
type InboxConversationPreview = any;

export interface UseInboxSocketOptions {
  organizationId: string;
  enabled?: boolean;
  onNewMessage?: (message: InboxMessagePreview) => void;
  onConversationUpdated?: (conversation: InboxConversationPreview) => void;
  onTyping?: (data: { conversationId: string; userId: string; isTyping: boolean }) => void;
}

export interface UseInboxSocketReturn {
  isConnected: boolean;
  error: string | null;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
}

export function useInboxSocket({
  organizationId,
  enabled = true,
  onNewMessage,
  onConversationUpdated,
  onTyping,
}: UseInboxSocketOptions): UseInboxSocketReturn {
  const [isConnected] = useState(false);
  const [error] = useState<string | null>(null);

  const sendTyping = useCallback((conversationId: string, isTyping: boolean) => {
    console.warn('[useInboxSocket] PartySocket not yet implemented, typing not sent:', { conversationId, isTyping });
  }, []);

  return {
    isConnected,
    error,
    sendTyping,
  };
}
