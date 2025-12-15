"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ConversationListItem } from "@/lib/chat/types";

interface ConversationItemProps {
  conversation: ConversationListItem;
  onClick: (conversation: ConversationListItem) => void;
  isSelected?: boolean;
}

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Format time for display
 */
function formatTime(dateString: string | null): string {
  if (!dateString) return "";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Today - show time
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (diffDays === 1) {
    return "Ontem";
  } else if (diffDays < 7) {
    return date.toLocaleDateString("pt-BR", { weekday: "short" });
  } else {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  }
}

/**
 * ConversationItem - Slim version (Chatwoot-inspired)
 *
 * Layout:
 * [Avatar]  Name                    14:32
 *           Last message preview that
 *           can span two lines...    (3)
 */
export function ConversationItem({
  conversation,
  onClick,
  isSelected = false,
}: ConversationItemProps) {
  const { contact, lastMessage, unreadCount } = conversation;

  // Get display name (name or phone)
  const displayName = contact.name ?? contact.phone ?? "Desconhecido";

  // Get initials for avatar fallback
  const initials = contact.name
    ? getInitials(contact.name)
    : contact.phone?.slice(-2) ?? "?";

  // Get message preview
  const messagePreview = lastMessage?.content ?? "Sem mensagens";

  return (
    <button
      type="button"
      onClick={() => onClick(conversation)}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent/50",
        isSelected && "bg-accent"
      )}
    >
      {/* Avatar - larger for better scannability */}
      <Avatar className="h-11 w-11 shrink-0">
        {contact.avatarUrl && <AvatarImage src={contact.avatarUrl} alt={displayName} />}
        <AvatarFallback className="text-sm">{initials}</AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Header row: name + time */}
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium">{displayName}</span>
          <span
            className="shrink-0 text-xs text-muted-foreground"
            data-testid="time-indicator"
          >
            {formatTime(lastMessage?.sentAt ?? conversation.lastMessageAt)}
          </span>
        </div>

        {/* Message preview + unread count */}
        <div className="flex items-end justify-between gap-2">
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {messagePreview}
          </p>
          {(unreadCount ?? 0) > 0 && (
            <Badge
              variant="destructive"
              className="h-5 min-w-5 shrink-0 justify-center px-1 text-xs"
              data-testid="unread-badge"
            >
              {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
