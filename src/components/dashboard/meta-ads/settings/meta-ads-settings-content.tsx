'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { MetaIcon } from '@/components/shared/icons'
import { useMetaAdsOnboarding } from '@/hooks/meta-ads/use-meta-ads-onboarding'
import { metaAdsClient } from '@/lib/meta-ads/client'
import type { MetaAdAccountSummary, MetaConnectionSummary, MetaPixelConfig } from '@/types/meta-ads/meta-ads'
import { MetaPixelsConfigArea } from './meta-pixels-config-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProjectSelector } from '@/components/dashboard/projects/project-selector'

const META_ADS_TAB_IDS = {
  adAccountsTrigger: 'meta-ads-tab-trigger-ad-accounts',
  adAccountsContent: 'meta-ads-tab-content-ad-accounts',
  pixelsTrigger: 'meta-ads-tab-trigger-pixels',
  pixelsContent: 'meta-ads-tab-content-pixels',
} as const

interface MetaAdsSettingsContentProps {
  organizationId: string | undefined
  initialConnections?: MetaConnectionSummary[]
  initialAdAccounts?: MetaAdAccountSummary[]
  initialPixels?: MetaPixelConfig[]
}

export function MetaAdsSettingsContent({
  organizationId,
  initialConnections,
  initialAdAccounts,
  initialPixels,
}: MetaAdsSettingsContentProps) {
  const queryClient = useQueryClient()

  const handleRefreshAll = () => {
    refetchConnections()
    refetchAccounts()
  }

  // 1. Fetch Connections
  const {
    data: connections,
    isLoading: loadingConnections,
    refetch: refetchConnections,
  } = useQuery<MetaConnectionSummary[]>({
    queryKey: ['meta-ads', 'connections', { organizationId }],
    queryFn: () => metaAdsClient.getConnections(organizationId!),
    enabled: !!organizationId,
    initialData: initialConnections,
  })

  // 2. Fetch Ad Accounts
  const {
    data: adAccounts,
    isLoading: loadingAccounts,
    refetch: refetchAccounts,
  } = useQuery<MetaAdAccountSummary[]>({
    queryKey: ['meta-ads', 'ad-accounts', { organizationId }],
    queryFn: () => metaAdsClient.getAdAccounts(organizationId!),
    enabled: !!organizationId,
    initialData: initialAdAccounts,
  })
  const connectionItems = connections ?? []
  const adAccountItems = adAccounts ?? []
  const hasConnections = (connections?.length ?? 0) > 0

  const { startOnboarding, isPending: isConnecting } = useMetaAdsOnboarding(
    organizationId,
    handleRefreshAll
  )

  // 3. Mutations
  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      isActive,
      projectId,
    }: {
      id: string
      isActive?: boolean
      projectId?: string | null
    }) => {
      return metaAdsClient.toggleAdAccount(id, { isActive, projectId }, organizationId!)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-ads', 'ad-accounts'] })
      toast.success('Rastreamento de conta atualizado')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar rastreamento')
    },
  })

  const syncMutation = useMutation({
    mutationFn: async () => {
      return metaAdsClient.getAdAccounts(organizationId!, { sync: true })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-ads', 'ad-accounts'] })
      toast.success('Contas sincronizadas')
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      return metaAdsClient.deleteConnection(id, organizationId!)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-ads', 'connections'] })
      queryClient.invalidateQueries({ queryKey: ['meta-ads', 'ad-accounts'] })
      toast.success('Conexão removida')
    },
  })

  return (
    <div className="bg-muted/5 min-h-[calc(100vh-16rem)] overflow-y-auto p-6 lg:p-8">
        <Tabs defaultValue="ad-accounts" className="w-full gap-5">
          <TabsList variant="line" className="mb-1 w-full justify-start rounded-none border-b p-0">
            <TabsTrigger
              value="ad-accounts"
              id={META_ADS_TAB_IDS.adAccountsTrigger}
              aria-controls={META_ADS_TAB_IDS.adAccountsContent}
              className="flex-none rounded-none px-4"
            >
              Contas de Anúncios
            </TabsTrigger>
            <TabsTrigger
              value="pixels"
              id={META_ADS_TAB_IDS.pixelsTrigger}
              aria-controls={META_ADS_TAB_IDS.pixelsContent}
              className="flex-none rounded-none px-4"
            >
              Pixels
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="ad-accounts"
            id={META_ADS_TAB_IDS.adAccountsContent}
            aria-labelledby={META_ADS_TAB_IDS.adAccountsTrigger}
            className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
          >
            <section className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => startOnboarding()}
                  disabled={isConnecting}
                  size="sm"
                  className="gap-2"
                >
                  {isConnecting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Conectar Novo Perfil
                </Button>
              </div>

              <div className="grid gap-4">
                {loadingConnections && connectionItems.length === 0 ? (
                  <div className="bg-muted/5 text-muted-foreground/30 flex justify-center rounded-xl border border-dashed p-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : connectionItems.length > 0 ? (
                  connectionItems.map((conn) => (
                    <Card key={conn.id} className="overflow-hidden border-blue-100 bg-blue-50/20">
                      <CardHeader className="flex flex-row items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                            <MetaIcon className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{conn.fbUserName}</CardTitle>
                            <CardDescription className="text-xs">
                              ID: {conn.fbUserId}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={conn.status === 'ACTIVE' ? 'default' : 'destructive'}
                            className="h-5"
                          >
                            {conn.status === 'ACTIVE' ? 'Ativo' : 'Erro'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => disconnectMutation.mutate(conn.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  ))
                ) : (
                  <Card className="flex flex-col items-center justify-center border-dashed bg-transparent p-8 text-center">
                    <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                      <MetaIcon className="text-muted-foreground h-6 w-6" />
                    </div>
                    <h3 className="font-medium">Nenhum perfil conectado</h3>
                    <p className="text-muted-foreground mb-4 mt-1 max-w-xs text-sm">
                      Conecte um perfil do Facebook para importar suas contas de anúncios e ativar o
                      rastreamento.
                    </p>
                    <Button
                      onClick={() => startOnboarding()}
                      disabled={isConnecting}
                      variant="outline"
                      size="sm"
                    >
                      {isConnecting ? 'Conectando...' : 'Conectar agora'}
                    </Button>
                  </Card>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending || !hasConnections}
                >
                  <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                  Sincronizar Contas
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="relative overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/50 border-b text-xs uppercase">
                        <tr>
                          <th className="px-6 py-4 font-semibold">Conta</th>
                          <th className="px-6 py-4 font-semibold">Projeto</th>
                          <th className="w-48 px-6 py-4 text-right font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {loadingAccounts && adAccountItems.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-8 text-center">
                              <RefreshCw className="text-muted-foreground/20 mx-auto h-6 w-6 animate-spin" />
                            </td>
                          </tr>
                        ) : adAccountItems.length > 0 ? (
                          adAccountItems.map((acc) => (
                            <tr
                              key={acc.id}
                              className={`hover:bg-muted/30 transition-colors ${acc.isActive ? 'bg-emerald-50/10' : ''}`}
                            >
                              <td className="px-6 py-4">
                                <div className="text-foreground font-medium">{acc.adAccountName}</div>
                                <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-[10px]">
                                  <span>{acc.adAccountId}</span>
                                  <Badge
                                    variant={acc.isActive ? 'default' : 'outline'}
                                    className={`h-4 px-1.5 text-[9px] font-normal ${acc.isActive ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                                  >
                                    {acc.isActive ? 'Ativa' : 'Inativa'}
                                  </Badge>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <ProjectSelector
                                  organizationId={organizationId}
                                  value={acc.projectId}
                                  onChange={(projectId) =>
                                    toggleMutation.mutate({ id: acc.id, projectId })
                                  }
                                  disabled={toggleMutation.isPending}
                                  className="h-8 rounded-xl text-xs"
                                  placeholder="Projeto"
                                />
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  <span
                                    className={`text-xs font-medium ${acc.isActive ? 'text-emerald-600' : 'text-muted-foreground'}`}
                                  >
                                    {acc.isActive ? 'ON' : 'OFF'}
                                  </span>
                                  <Switch
                                    checked={acc.isActive}
                                    onCheckedChange={(val) =>
                                      toggleMutation.mutate({ id: acc.id, isActive: val })
                                    }
                                    className={
                                      acc.isActive ? 'data-[state=checked]:bg-emerald-500' : ''
                                    }
                                  />
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="text-muted-foreground px-6 py-12 text-center italic">
                              {hasConnections
                                ? 'Nenhuma conta encontrada. Clique em Sincronizar.'
                                : 'Conecte um perfil para importar contas de anúncios.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          <TabsContent
            value="pixels"
            id={META_ADS_TAB_IDS.pixelsContent}
            aria-labelledby={META_ADS_TAB_IDS.pixelsTrigger}
          >
            <MetaPixelsConfigArea organizationId={organizationId} initialPixels={initialPixels} />
          </TabsContent>
        </Tabs>
    </div>
  )
}
