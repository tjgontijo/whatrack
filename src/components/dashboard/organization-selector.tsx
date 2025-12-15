'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth/auth-client'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

/**
 * Garante que haja uma organização ativa:
 * - Se houver apenas uma, seleciona automaticamente.
 * - Se houver mais de uma e nenhuma ativa, mostra um seletor simples.
 */
export function OrganizationSelectorGate() {
  const { data: session } = authClient.useSession()
  const { data: activeOrg, isPending: loadingActive } = authClient.useActiveOrganization()
  const { data: organizations, isPending: loadingList, refetch } = authClient.useListOrganizations()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isSetting, setIsSetting] = useState(false)

  const orgs = useMemo(() => organizations ?? [], [organizations])

  // Auto select when there is exactly one organization
  useEffect(() => {
    if (!session || loadingActive || loadingList) return
    if (activeOrg) return
    if (orgs.length === 1) {
      setIsSetting(true)
      authClient.organization
        .setActive({ organizationId: orgs[0].id })
        .then(() => refetch())
        .catch(() => toast.error('Falha ao selecionar organização'))
        .finally(() => setIsSetting(false))
    }
  }, [session, activeOrg, orgs, loadingActive, loadingList, refetch])

  if (!session || activeOrg || loadingActive) return null
  if (loadingList) return null

  const handleSelect = async () => {
    if (!selectedId) {
      toast.error('Selecione uma organização')
      return
    }
    setIsSetting(true)
    try {
      await authClient.organization.setActive({ organizationId: selectedId })
      toast.success('Organização selecionada')
      refetch()
    } catch (error) {
      toast.error('Falha ao selecionar organização')
      console.error('[OrganizationSelectorGate] setActive error', error)
    } finally {
      setIsSetting(false)
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium">Selecione uma organização para continuar</p>
          <p className="text-xs text-muted-foreground">
            É necessário definir a organização ativa para carregar os dados do dashboard.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Select
            value={selectedId ?? undefined}
            onValueChange={(val) => setSelectedId(val)}
            disabled={isSetting}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Escolha a organização" />
            </SelectTrigger>
            <SelectContent>
              {orgs.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSelect} disabled={isSetting}>
            {isSetting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aplicando...
              </>
            ) : (
              'Selecionar'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
