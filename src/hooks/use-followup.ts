/**
 * React Query hooks for Follow-up API
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Query keys for cache management
export const followupKeys = {
  all: ["followup"] as const,
  details: () => [...followupKeys.all, "detail"] as const,
  detail: (ticketId: string) => [...followupKeys.details(), ticketId] as const,
};

// Types
export interface FollowupStatus {
  enabled: boolean;
  currentStep: number | null;
  maxSteps: number;
  scheduledMessages: Array<{
    id: string;
    step: number;
    scheduledAt: string;
    sentAt: string | null;
    cancelledAt: string | null;
  }>;
  config: {
    isActive: boolean;
    aiTone: string;
    businessHoursOnly: boolean;
    businessStartHour: number;
    businessEndHour: number;
    businessDays: number[];
    steps: Array<{
      order: number;
      delayMinutes: number;
    }>;
  } | null;
}

// API functions
async function getFollowupStatus(ticketId: string): Promise<FollowupStatus> {
  const res = await fetch(`/api/v1/tickets/${ticketId}/followup`);
  if (!res.ok) {
    throw new Error("Failed to fetch follow-up status");
  }
  return res.json();
}

async function enableFollowup(ticketId: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/v1/tickets/${ticketId}/followup`, {
    method: "POST",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Failed to enable follow-up");
  }
  return res.json();
}

async function disableFollowup(ticketId: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/v1/tickets/${ticketId}/followup`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to disable follow-up");
  }
  return res.json();
}

async function skipToNextStep(ticketId: string): Promise<{ success: boolean; hasNextStep: boolean }> {
  const res = await fetch(`/api/v1/tickets/${ticketId}/followup`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "skip" }),
  });
  if (!res.ok) {
    throw new Error("Failed to skip step");
  }
  return res.json();
}

/**
 * Fetch follow-up status for a ticket
 */
export function useFollowupStatus(ticketId: string | undefined) {
  return useQuery({
    queryKey: followupKeys.detail(ticketId!),
    queryFn: () => getFollowupStatus(ticketId!),
    enabled: !!ticketId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Enable follow-up for a ticket
 */
export function useEnableFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketId: string) => enableFollowup(ticketId),
    onSuccess: (_, ticketId) => {
      void queryClient.invalidateQueries({
        queryKey: followupKeys.detail(ticketId),
      });
    },
  });
}

/**
 * Disable follow-up for a ticket
 */
export function useDisableFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketId: string) => disableFollowup(ticketId),
    onSuccess: (_, ticketId) => {
      void queryClient.invalidateQueries({
        queryKey: followupKeys.detail(ticketId),
      });
    },
  });
}

/**
 * Skip to next follow-up step
 */
export function useSkipFollowupStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketId: string) => skipToNextStep(ticketId),
    onSuccess: (_, ticketId) => {
      void queryClient.invalidateQueries({
        queryKey: followupKeys.detail(ticketId),
      });
    },
  });
}
