/**
 * React Query hooks for WhatsApp Instances API
 *
 * Substitui o antigo use-channels; agora tratamos por instância.
 */

import { useQuery } from "@tanstack/react-query";

export interface InstanceWithUnread {
  id: string;
  label?: string | null;
  phone?: string | null;
  status: string | null;
  unreadCount: number;
}

// Query keys for cache management
export const instancesKeys = {
  all: ["instances"] as const,
  withUnread: () => [...instancesKeys.all, "with-unread"] as const,
};

/**
 * Fetch instances with unread message count
 * Used by chat landing to decide redirecionamento/estado vazio
 */
async function fetchInstancesWithUnread(): Promise<InstanceWithUnread[]> {
  const response = await fetch("/api/v1/instances/with-unread", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch instances");
  }

  const payload = (await response.json()) as { items?: unknown[] } | InstanceWithUnread[];
  if (Array.isArray(payload)) {
    return payload;
  }

  return (payload.items ?? []).map((item: unknown) => {
    const obj = item as Record<string, unknown>;
    return {
      id: (obj.id ?? obj.instanceId ?? "") as string,
      label: (obj.label ?? obj.name ?? null) as string | null,
      phone: (obj.phone ?? null) as string | null,
      status: (obj.status ?? null) as string | null,
      unreadCount: (obj.unreadCount ?? 0) as number,
    };
  });
}

/**
 * Hook to get instances with unread count
 * Auto-refetches every 30 seconds to keep badge counts updated
 */
export function useInstancesWithUnread() {
  return useQuery({
    queryKey: instancesKeys.withUnread(),
    queryFn: fetchInstancesWithUnread,
    // Refetch every 30 seconds to keep counts updated
    refetchInterval: 30000,
    // Also refetch when window regains focus
    refetchOnWindowFocus: true,
  });
}
