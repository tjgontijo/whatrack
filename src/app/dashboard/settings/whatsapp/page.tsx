'use client'
import { AlertTriangle, Loader2, Phone, Plus, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { TemplateMainShell, TemplateMainHeader, DataToolbar } from '@/components/dashboard/leads'
import { useIsMobile } from '@/hooks/ui/use-mobile'
import { useOrganizationCompletion } from '@/hooks/organization/use-organization-completion'
import { whatsappApi } from '@/lib/whatsapp/client'
import { useWhatsAppOnboarding } from '@/hooks/whatsapp/use-whatsapp-onboarding'
import { InstanceCard } from '@/components/dashboard/whatsapp/instance-card'
import { EmbeddedSignupButton } from '@/components/dashboard/whatsapp/embedded-signup-button'
import type { WhatsAppPhoneNumber } from '@/types/whatsapp/whatsapp'

import { useOrganization } from '@/hooks/organization/use-organization'

export default function WhatsAppSettingsPage() {
  const isMobile = useIsMobile()
  const completionQuery = useOrganizationCompletion()
  const { data: org } = useOrganization()
  const orgId = org?.id

  const hasOrganization = completionQuery.data?.hasOrganization ?? false
  const canLoadInstances = completionQuery.isSuccess && hasOrganization && !!orgId

  const {
    data: phoneNumbers,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<WhatsAppPhoneNumber[]>({
    queryKey: ['whatsapp', 'phone-numbers', orgId],
    queryFn: () => whatsappApi.listPhoneNumbers(orgId!),
    staleTime: 30_000,
    retry: false,
    enabled: canLoadInstances,
  })


  const handleRefresh = () => {
    void completionQuery.refetch()
    void refetch()
  }

  const {
    status: onboardingStatus,
    sdkReady,
    startOnboarding,
  } = useWhatsAppOnboarding(handleRefresh)
  const isOnboarding = onboardingStatus === 'pending'

  const rawErrorMessage = error instanceof Error ? error.message : ''
  const unauthorizedError = /unauthorized|não autenticado|acesso negado/i.test(rawErrorMessage)
  const errorMessage = rawErrorMessage || 'Houve um problema ao conectar com a API da Meta.'

  return (
    <TemplateMainShell className="flex h-[calc(100vh-2rem)] flex-col">
      <TemplateMainHeader
        title="Instâncias WhatsApp"
        subtitle="Gerencie seus números conectados e templates de mensagens"
        actions={
          <Button
            variant="default"
            size="sm"
            className="h-8 gap-2 font-bold shadow-sm"
            onClick={startOnboarding}
            disabled={!sdkReady || isOnboarding || completionQuery.isLoading}
          >
            {isOnboarding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {!isMobile && 'Nova Instância'}
          </Button>
        }
      />

      <div className="border-border bg-background/50 supports-[backdrop-filter]:bg-background/50 border-b px-6 backdrop-blur">
        <DataToolbar
          searchValue=""
          onSearchChange={() => { }}
          searchPlaceholder="Buscar instância..."
          actions={
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-2 text-xs font-semibold"
              onClick={handleRefresh}
              disabled={isRefetching || completionQuery.isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
              <span>{!isMobile && 'Atualizar'}</span>
            </Button>
          }
        />
      </div>

      <div
        className={
          isMobile
            ? 'bg-muted/5 scrollbar-hide flex-1 overflow-y-scroll p-4'
            : 'bg-muted/5 flex-1 overflow-y-auto p-8'
        }
      >
        {completionQuery.isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <RefreshCw className="text-primary/40 h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm font-medium">Validando dados da organização...</p>
          </div>
        ) : completionQuery.isError ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-full">
              <AlertTriangle className="text-destructive h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Não foi possível validar a organização</h3>
              <p className="text-muted-foreground text-sm">
                Atualize a página e tente novamente.
              </p>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              Tentar novamente
            </Button>
          </div>
        ) : !hasOrganization ? (
          <div className="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center gap-5 py-12">
            <div className="w-full rounded-lg border border-amber-300 bg-amber-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-amber-900">
                    Cadastro da organização pendente
                  </h3>
                  <p className="text-sm text-amber-800/90">
                    Crie sua organização e o primeiro projeto para começar a conectar instâncias do WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <RefreshCw className="text-primary/40 h-8 w-8 animate-spin" />
            <p className="text-muted-foreground text-sm font-medium">Carregando instâncias...</p>
          </div>
        ) : error ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-4 py-12">
            <div className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-full">
              <Phone className="text-destructive h-6 w-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Erro ao carregar instâncias</h3>
              <p className="text-muted-foreground text-sm">{errorMessage}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button onClick={() => refetch()} variant="outline" size="sm">
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : !phoneNumbers || phoneNumbers.length === 0 ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center py-12">
            <EmbeddedSignupButton onSuccess={handleRefresh} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {phoneNumbers.map((phone) => (
              <InstanceCard key={phone.id} phone={phone} />
            ))}
          </div>
        )}
      </div>
    </TemplateMainShell>
  )
}
