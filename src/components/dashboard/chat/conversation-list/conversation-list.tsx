"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ConversationItem } from "./conversation-item";
import type { ConversationListItem } from "@/lib/chat/types";

interface ConversationListProps {
  conversations: ConversationListItem[];
  onSelect: (conversation: ConversationListItem) => void;
  isLoading: boolean;
  selectedId?: string;
}

/**
 * Loading skeleton for conversation list
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-2 p-2" data-testid="loading-skeleton">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <p className="text-muted-foreground">Nenhuma conversa</p>
      <p className="text-sm text-muted-foreground">
        As conversas aparecerão aqui quando você receber mensagens
      </p>
    </div>
  );
}

export function ConversationList({
  conversations,
  onSelect,
  isLoading,
  selectedId,
}: ConversationListProps) {
  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Empty state
  if (conversations.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with count */}
      <div className="border-b px-4 py-2">
        <span className="text-sm text-muted-foreground">
          {conversations.length} conversas
        </span>
      </div>

      {/* Scrollable list */}
      <ScrollArea className="flex-1" data-testid="conversation-list-scroll">
        <div className="space-y-1 p-2">
          {conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              onClick={onSelect}
              isSelected={selectedId === conversation.id}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
