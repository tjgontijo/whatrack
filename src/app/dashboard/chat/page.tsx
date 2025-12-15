"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Plus } from "lucide-react";
import { useInstancesWithUnread } from "@/hooks/use-instances";
import { Button } from "@/components/ui/button";

/**
 * Empty state when no instances are connected
 */
function NoChannelsState() {
  return (
    <div
      className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center text-center"
      data-testid="no-channels-state"
    >
      <div className="mx-auto max-w-md space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Nenhuma instância conectada</h2>
        <p className="text-sm text-muted-foreground">
          Conecte sua primeira instância do WhatsApp para começar a receber e
          responder mensagens.
        </p>
        <Button asChild>
          <Link href="/dashboard/settings/whatsapp">
            <Plus className="mr-2 h-4 w-4" />
            Conectar instância
          </Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * Loading state while fetching channels
 */
function LoadingState() {
  return (
    <div
      className="flex h-[calc(100vh-4rem)] items-center justify-center"
      data-testid="chat-loading"
    >
      <div className="text-muted-foreground">Carregando...</div>
    </div>
  );
}

/**
 * Chat Page - Redirects to first instance or shows empty state
 *
 * This page acts as a router:
 * - If loading → show loading state
 * - If no instances → show "connect your first instance" empty state
 * - If instances exist → redirect to first instance's chat
 */
export default function ChatPage() {
  const router = useRouter();
  const { data: instances, isLoading, error } = useInstancesWithUnread();

  useEffect(() => {
    // If we have instances, redirect to the first one
    if (instances && instances.length > 0) {
      const firstInstance = instances[0];
      if (firstInstance) {
        router.replace(`/dashboard/chat/instance/${firstInstance.id}`);
      }
    }
  }, [instances, router]);

  // Show loading while fetching instances
  if (isLoading) {
    return <LoadingState />;
  }

  // If error, show empty state (treats as no instances)
  if (error) {
    return <NoChannelsState />;
  }

  // No instances - show empty state
  if (!instances || instances.length === 0) {
    return <NoChannelsState />;
  }

  // Instances exist - show loading while redirecting
  return <LoadingState />;
}
