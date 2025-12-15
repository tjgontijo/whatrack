"use client";

import { useState, useCallback, useRef, useEffect, use, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ConversationList } from "@/components/dashboard/chat/conversation-list";
import { ChatMessage, ChatInput, ConnectionStatus } from "@/components/dashboard/chat/chat";
import { ContactPanel } from "@/components/dashboard/chat/contact-panel";
import {
  useConversations,
  useConversation,
  useMessages,
  useSendMessage,
  useUpdateConversation,
  conversationsKeys,
} from "@/hooks/use-conversations";
import { useOrganization } from "@/hooks/use-organization";
import type {
  ConversationListItem,
  ConversationStatus,
  Message,
} from "@/lib/chat/types";

/**
 * Empty chat state component
 */
function EmptyChatState() {
  return (
    <div
      className="flex h-full flex-col items-center justify-center text-center"
      data-testid="empty-chat-state"
    >
      <div className="text-muted-foreground">
        <p className="text-lg font-medium">Selecione uma conversa</p>
        <p className="text-sm">Escolha uma conversa para visualizar as mensagens</p>
      </div>
    </div>
  );
}

/**
 * Chat Area component with proper overflow handling
 */
interface ChatAreaProps {
  conversationId: string;
  onSend: (content: string) => void;
  isSending: boolean;
  isConnected: boolean;
  connectionError: string | null;
}

function ChatArea({ conversationId, onSend, isSending, isConnected, connectionError }: ChatAreaProps) {
  const { data: conversation, isLoading: isLoadingConversation } =
    useConversation(conversationId);
  const { data: messagesData, isLoading: isLoadingMessages } =
    useMessages(conversationId);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => messagesData?.messages ?? [], [messagesData?.messages]);
  const isLoading = isLoadingConversation || isLoadingMessages;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading || !conversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" data-testid="chat-panel">
      {/* Chat header - fixed height */}
      <div className="shrink-0 border-b px-4 py-3" data-testid="chat-header">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">{conversation.contact?.name ?? "Chat"}</h2>
            <p className="text-sm text-muted-foreground">
              {conversation.instance?.label ?? conversation.instance?.phone ?? ""}
            </p>
          </div>
          <ConnectionStatus isConnected={isConnected} error={connectionError} />
        </div>
      </div>

      {/* Messages area - scrollable */}
      <div
        className="flex-1 overflow-y-auto"
        data-testid="messages-scroll-area"
      >
        <div className="flex min-h-full flex-col justify-end py-2">
          <div className="space-y-1">
            {messages.map((message: Message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </div>
          {/* Anchor for auto-scroll */}
          <div ref={messagesEndRef} data-testid="messages-end-anchor" />
        </div>
      </div>

      {/* Input area - fixed height */}
      <div className="shrink-0" data-testid="chat-input-area">
        <ChatInput onSend={onSend} isSending={isSending} />
      </div>
    </div>
  );
}

/**
 * Contact Panel Wrapper
 */
interface ContactPanelWrapperProps {
  conversationId: string;
  onStatusChange: (status: ConversationStatus) => void;
  isUpdating: boolean;
}

function ContactPanelWrapper({
  conversationId,
  onStatusChange,
  isUpdating,
}: ContactPanelWrapperProps) {
  const { data: conversation, isLoading } = useConversation(conversationId);

  if (isLoading || !conversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  return (
    <div data-testid="contact-panel" className="h-full">
      <ContactPanel
        conversation={conversation}
        onStatusChange={onStatusChange}
        isUpdating={isUpdating}
      />
    </div>
  );
}

/**
 * Instance Chat Page - Shows conversations for a specific WhatsApp instance
 */
export default function InstanceChatPage({
  params,
}: {
  params: Promise<{ instanceId: string }>;
}) {
  // Unwrap params using React.use() for Next.js 15
  const { instanceId } = use(params);

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Get current organization for real-time socket
  const { data: organization } = useOrganization();

  // Fetch conversations filtered by instance
  const { data: conversations, isLoading } = useConversations({ instanceId });

  // Handle real-time new message
  const handleNewMessage = useCallback(
    (message: Message & { conversationId: string }) => {
      console.log("Real-time: New message received", message);
      console.log("Real-time: Invalidating queries for conversation:", message.conversationId);
      // Invalidate and refetch messages for this conversation
      void queryClient.invalidateQueries({
        queryKey: conversationsKeys.messages(message.conversationId),
        refetchType: "active",
      });
      // Invalidate conversation detail
      void queryClient.invalidateQueries({
        queryKey: conversationsKeys.detail(message.conversationId),
        refetchType: "active",
      });
      // Invalidate conversations list to update order/preview
      void queryClient.invalidateQueries({
        queryKey: conversationsKeys.lists(),
        refetchType: "active",
      });
    },
    [queryClient]
  );

  // Handle real-time conversation update
  const handleConversationUpdated = useCallback(
    (conversation: ConversationListItem) => {
      console.log("Real-time: Conversation updated", conversation);
      // Invalidate this conversation
      void queryClient.invalidateQueries({
        queryKey: conversationsKeys.detail(conversation.id),
      });
      // Invalidate conversations list
      void queryClient.invalidateQueries({
        queryKey: conversationsKeys.lists(),
      });
    },
    [queryClient]
  );

  // Real-time connection via Centrifugo (will be implemented in PRD)
  const isConnected = true;
  const connectionError = null;

  // Send message mutation
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();

  // Update conversation mutation (for status changes)
  const { mutate: updateConversation, isPending: isUpdating } = useUpdateConversation();

  // Handle conversation selection
  const handleSelectConversation = useCallback(
    (conversation: ConversationListItem) => {
      setSelectedConversationId(conversation.id);
    },
    []
  );

  // Handle send message
  const handleSendMessage = useCallback(
    (content: string) => {
      if (!selectedConversationId) return;

      sendMessage({
        conversationId: selectedConversationId,
        data: { content },
      });
    },
    [selectedConversationId, sendMessage]
  );

  // Handle status change
  const handleStatusChange = useCallback(
    (status: ConversationStatus) => {
      if (!selectedConversationId) return;

      updateConversation({
        id: selectedConversationId,
        data: { status },
      });
    },
    [selectedConversationId, updateConversation]
  );

  // Handle priority change
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Main content - Resizable 2 or 3-column layout */}
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 overflow-hidden"
        data-testid="chat-panel-group"
      >
        {/* Left column - Conversation list */}
        <ResizablePanel
          defaultSize={25}
          minSize={15}
          maxSize={40}
          data-testid="conversations-panel"
        >
          <ConversationList
            conversations={conversations ?? []}
            onSelect={handleSelectConversation}
            isLoading={isLoading}
            selectedId={selectedConversationId ?? undefined}
          />
        </ResizablePanel>

        <ResizableHandle withHandle data-testid="resize-handle" />

        {/* Center column - Chat area */}
        <ResizablePanel defaultSize={50} minSize={30}>
          {selectedConversationId ? (
            <ChatArea
              conversationId={selectedConversationId}
              onSend={handleSendMessage}
              isSending={isSending}
              isConnected={isConnected}
              connectionError={connectionError}
            />
          ) : (
            <EmptyChatState />
          )}
        </ResizablePanel>

        {selectedConversationId && (
          <>
            <ResizableHandle withHandle data-testid="resize-handle" />

            {/* Right column - Contact panel */}
            <ResizablePanel
              defaultSize={25}
              minSize={15}
              maxSize={40}
            >
              <ContactPanelWrapper
                conversationId={selectedConversationId}
                onStatusChange={handleStatusChange}
                isUpdating={isUpdating}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
