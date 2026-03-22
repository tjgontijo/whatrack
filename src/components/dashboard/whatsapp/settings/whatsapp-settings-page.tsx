'use client'

import { useDeferredValue } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Loader2, Phone } from 'lucide-react'

import { CrudEmptyState } from '@/components/dashboard/crud/crud-data-view'
import { EmptyState } from '@/components/dashboard/states/empty-state'
import { InstanceCard } from '@/components/dashboard/whatsapp/instance-card'
import { Button } from '@/components/ui/button'
import { whatsappApi } from '@/lib/whatsapp/client'
import { useOrganization } from '@/hooks/organization/use-organization'
import type { WhatsAppPhoneNumber } from '@/types/whatsapp/whatsapp'

type WhatsAppSettingsPageProps = {
  organizationId?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  sdkReady?: boolean
  isOnboarding?: boolean
  onStartOnboarding?: () => void
}

export function WhatsAppSettingsPage({
  organizationId: propOrgId,
  searchValue = '',
  onSearchChange = () => {},
  sdkReady = false,
  isOnboarding = false,
  onStartOnboarding = () => {},
}: WhatsAppSettingsPageProps) {
  const { data: org } = useOrganization()
  const deferredSearch = useDeferredValue(searchValue)
  const orgId = propOrgId ?? org?.id

  const {
    data: phoneNumbers,
    isLoading,
    error,
    refetch,
  } = useQuery<WhatsAppPhoneNumber[]>({
    queryKey: ['whatsapp', 'phone-numbers', orgId],
    queryFn: () => whatsappApi.listPhoneNumbers(orgId!),
    staleTime: 30_000,
    retry: false,
    enabled: !!orgId,
  })

  const errorMessage =
    error instanceof Error ? error.message : 'Houve um problema ao conectar com a API da Meta.'

  const normalizedSearch = deferredSearch.trim().toLowerCase()
  const filteredPhoneNumbers =
    phoneNumbers?.filter((phone) => {
      if (!normalizedSearch) return true
      return [phone.verified_name, phone.display_phone_number, phone.projectName, phone.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    }) ?? []

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="text-muted-foreground/40 h-6 w-6 animate-spin" />
        <p className="text-muted-foreground text-sm">Carregando instâncias...</p>
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={Phone}
        title="Erro ao carregar instâncias"
        description={errorMessage}
        action={
          <Button onClick={() => void refetch()} variant="outline" size="sm">
            Tentar novamente
          </Button>
        }
      />
    )
  }

  if (!phoneNumbers || phoneNumbers.length === 0) {
    return (
      <CrudEmptyState
        title="Nenhuma instância conectada"
        description="Conecte sua conta WhatsApp Business à Meta para começar a usar o canal."     
      />
    )
  }

  if (filteredPhoneNumbers.length === 0) {
    return (
      <CrudEmptyState
        title="Nenhuma instância encontrada"
        description="Ajuste o termo da busca para localizar outra instância."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {filteredPhoneNumbers.map((phone) => (
        <InstanceCard key={phone.id} phone={phone} />
      ))}
    </div>
  )
}
