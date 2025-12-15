/**
 * Hook para obter a organização ativa a partir do better-auth (plugin organization)
 *
 * Usa o authClient (better-auth/react) e expõe apenas id/nome básicos.
 */
import { useSession } from "@/lib/auth/auth-client";

interface OrganizationSummary {
  id: string;
  name?: string | null;
}

export function useOrganization(): {
  data: OrganizationSummary | null;
  isLoading: boolean;
  error: unknown;
} {
  const { data: session, isPending, error } = useSession();

  // O plugin de organization expõe activeOrganizationId ou activeOrganization (dependendo da config)
  const activeOrganizationId =
    (session?.session as { activeOrganizationId?: string })?.activeOrganizationId ??
    (session?.session as { organizationId?: string })?.organizationId ??
    null;

  // Se tiver um objeto completo de org, priorizamos
  const activeOrgObject = (session?.session as { activeOrganization?: { id: string; name?: string | null } })?.activeOrganization ?? null;

  const orgData: OrganizationSummary | null =
    activeOrgObject?.id
      ? { id: activeOrgObject.id, name: activeOrgObject.name ?? null }
      : activeOrganizationId
        ? { id: activeOrganizationId, name: activeOrgObject?.name ?? null }
        : null;

  return {
    data: orgData,
    isLoading: isPending,
    error,
  };
}
