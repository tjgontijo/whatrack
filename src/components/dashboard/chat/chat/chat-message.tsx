"use client";

import { useState } from "react";
import Image from "next/image";
import { Bot, Check, CheckCheck, Clock, AlertCircle, Copy, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Message, SenderType, MessageStatus } from "@/lib/chat/types";

interface ChatMessageProps {
  message: Message;
}

/**
 * Format time for display
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Check if sender is outgoing (user or AI)
 */
function isOutgoing(senderType: SenderType): boolean {
  return senderType === "USER" || senderType === "AI_AGENT";
}

/**
 * Status indicator component
 */
function StatusIndicator({ status }: { status: MessageStatus }) {
  switch (status) {
    case "PENDING":
      return (
        <Clock
          className="h-3 w-3 text-muted-foreground"
          data-testid="status-pending"
        />
      );
    case "SENT":
      return (
        <Check
          className="h-3 w-3 text-muted-foreground"
          data-testid="status-sent"
        />
      );
    case "DELIVERED":
      return (
        <CheckCheck
          className="h-3 w-3 text-muted-foreground"
          data-testid="status-delivered"
        />
      );
    case "READ":
      return (
        <CheckCheck
          className="h-3 w-3 text-blue-500"
          data-testid="status-read"
        />
      );
    case "FAILED":
      return (
        <AlertCircle
          className="h-3 w-3 text-destructive"
          data-testid="status-failed"
        />
      );
    default:
      return null;
  }
}

/**
 * Render message content based on type
 */
function MessageContent({ message }: { message: Message }) {
  const { messageType, content, mediaUrl } = message;

  // Image message
  if (messageType === "IMAGE" && mediaUrl) {
    return (
      <div className="relative max-w-[200px] min-h-[100px] rounded-lg overflow-hidden">
        <Image
          src={mediaUrl}
          alt="Imagem"
          width={200}
          height={200}
          className="rounded-lg object-contain w-auto h-auto"
          unoptimized
        />
      </div>
    );
  }

  // Video message
  if (messageType === "VIDEO" && mediaUrl) {
    return (
      <video
        src={mediaUrl}
        controls
        className="max-w-[200px] rounded-lg"
      />
    );
  }

  // Audio message
  if (messageType === "AUDIO" && mediaUrl) {
    return <audio src={mediaUrl} controls className="max-w-[200px]" />;
  }

  // Document message
  if (messageType === "DOCUMENT" && mediaUrl) {
    return (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm underline"
      >
        {message.fileName ?? "Documento"}
      </a>
    );
  }

  // Text message (default)
  if (content) {
    return <p className="text-sm whitespace-pre-wrap">{content}</p>;
  }

  // Empty content fallback
  return (
    <p className="text-sm italic text-muted-foreground">
      [Mensagem sem conteúdo]
    </p>
  );
}

/**
 * Get initials from name
 */
function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? "?";
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const { senderType, senderName, sentAt, status, content } = message;
  const outgoing = isOutgoing(senderType);
  const isAI = senderType === "AI_AGENT";
  const isContact = senderType === "CONTACT";

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "group flex gap-3 px-4 py-2",
        outgoing ? "flex-row-reverse" : "flex-row"
      )}
      data-testid="message-container"
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0 shadow-sm">
        <AvatarFallback
          className={cn(
            "text-xs",
            isContact
              ? "bg-muted"
              : isAI
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300"
                : "bg-primary text-primary-foreground"
          )}
        >
          {isAI ? (
            <Bot className="h-4 w-4" />
          ) : isContact ? (
            getInitials(senderName)
          ) : (
            <User className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div
        className={cn(
          "flex max-w-[70%] flex-col gap-1",
          outgoing ? "items-end" : "items-start"
        )}
      >
        {/* Name and copy button row */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {isAI ? "AI Assistente" : senderName ?? "Desconhecido"}
          </span>
          {content && !outgoing && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={handleCopy}
              data-testid="copy-button"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>

        {/* Message bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2",
            outgoing
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted text-foreground rounded-bl-md"
          )}
          data-testid="message-bubble"
        >
          <MessageContent message={message} />
        </div>

        {/* Time and status row */}
        <div
          className={cn(
            "flex items-center gap-1 text-xs text-muted-foreground",
            outgoing && "justify-end"
          )}
        >
          <span data-testid="message-time">{formatTime(sentAt)}</span>
          {outgoing && <StatusIndicator status={status} />}
        </div>
      </div>
    </div>
  );
}
