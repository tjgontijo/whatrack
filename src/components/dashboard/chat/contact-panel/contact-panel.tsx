"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Phone, MessageSquare, Calendar, CheckCircle, RotateCcw } from "lucide-react";
import type { ConversationDetail, ConversationStatus, Priority } from "@/lib/chat/types";

interface ContactPanelProps {
  conversation: ConversationDetail;
  onStatusChange: (status: ConversationStatus) => void;
  onPriorityChange: (priority: Priority) => void;
  isUpdating?: boolean;
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
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get status display info
 */
function getStatusInfo(status: ConversationStatus): { label: string; variant: "default" | "secondary" | "outline" } {
  switch (status) {
    case "OPEN":
      return { label: "Open", variant: "default" };
    case "RESOLVED":
      return { label: "Resolved", variant: "secondary" };
    case "PENDING":
      return { label: "Pending", variant: "outline" };
    case "SNOOZED":
      return { label: "Snoozed", variant: "outline" };
    default:
      return { label: status, variant: "outline" };
  }
}

/**
 * Get priority display info
 */
function getPriorityInfo(priority: Priority): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  switch (priority) {
    case "LOW":
      return { label: "Low", variant: "outline" };
    case "MEDIUM":
      return { label: "Medium", variant: "secondary" };
    case "HIGH":
      return { label: "High", variant: "default" };
    case "URGENT":
      return { label: "Urgent", variant: "destructive" };
    default:
      return { label: priority, variant: "outline" };
  }
}

export function ContactPanel({
  conversation,
  onStatusChange,
  isUpdating = false,
}: Omit<ContactPanelProps, 'onPriorityChange'>) {
  const { contact, status, priority, createdAt } = conversation;
  const instance = conversation.instance ?? { label: null, phone: null };

  // Get display name
  const displayName = contact.name ?? contact.phone ?? "Desconhecido";

  // Get initials for avatar fallback
  const initials = contact.name
    ? getInitials(contact.name)
    : contact.phone?.slice(-2) ?? "?";

  // Status and priority info
  const statusInfo = getStatusInfo(status);
  const priorityInfo = getPriorityInfo(priority);

  // Is conversation resolved?
  const isResolved = status === "RESOLVED";

  return (
    <div className="flex h-full flex-col p-4">
      {/* Contact Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <Avatar className="h-20 w-20">
          {contact.avatarUrl && (
            <AvatarImage src={contact.avatarUrl} alt={displayName} />
          )}
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>

        <div>
          <h3 className="font-semibold">{displayName}</h3>
          {contact.phone && (
            <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              {contact.phone}
            </p>
          )}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Instance Info */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Instância:</span>
          <span>{instance.label ?? instance.phone ?? "WhatsApp"}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Criado:</span>
          <span data-testid="created-date">{formatDate(createdAt)}</span>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Status and Priority */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge variant={statusInfo.variant} data-testid="status-value">
            {statusInfo.label}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Prioridade:</span>
          <Badge variant={priorityInfo.variant} data-testid="priority-value">
            {priorityInfo.label}
          </Badge>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Actions */}
      <div className="mt-auto space-y-2">
        {isResolved ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onStatusChange("OPEN")}
            disabled={isUpdating}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reabrir Conversa
          </Button>
        ) : (
          <Button
            variant="default"
            className="w-full"
            onClick={() => onStatusChange("RESOLVED")}
            disabled={isUpdating}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Resolver Conversa
          </Button>
        )}
      </div>
    </div>
  );
}
