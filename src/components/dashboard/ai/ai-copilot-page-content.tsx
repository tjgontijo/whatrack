'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles } from 'lucide-react'

import { PageContent, PageHeader, PageShell } from '@/components/dashboard/layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthorization } from '@/hooks/auth/use-authorization'
import { useRequiredProjectPath } from '@/hooks/project/project-route-context'
import { AiApprovalsContent } from './ai-approvals-content'
import { AiUsageContent } from './ai-usage-content'

type AiCopilotPageContentProps = {
  initialTab: string
}

const DEFAULT_TAB = 'approvals'

export function AiCopilotPageContent({ initialTab }: AiCopilotPageContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authorization = useAuthorization()
  const aiPath = useRequiredProjectPath('/ia')
  const canViewUsage = authorization.isLoading || authorization.isAdmin

  const selectedTab = useMemo(() => {
    if (initialTab === 'usage' && canViewUsage) {
      return 'usage'
    }

    return DEFAULT_TAB
  }, [canViewUsage, initialTab])

  return (
    <PageShell maxWidth="7xl">
      <PageHeader
        title="IA Copilot"
        description="Centralize aprovações e acompanhe o custo operacional da IA no workspace."
        icon={Sparkles}
      />

      <PageContent>
        <Tabs
          value={selectedTab}
          onValueChange={(tab) => {
            const params = new URLSearchParams(searchParams.toString())

            if (tab === DEFAULT_TAB) {
              params.delete('tab')
            } else {
              params.set('tab', tab)
            }

            const query = params.toString()
            router.replace(query ? `${aiPath}?${query}` : aiPath)
          }}
          className="gap-6"
        >
          <TabsList variant="line" className="w-full justify-start rounded-none border-b p-0">
            <TabsTrigger value="approvals">Aprovações</TabsTrigger>
            {canViewUsage ? <TabsTrigger value="usage">Uso e custo</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="approvals">
            <AiApprovalsContent />
          </TabsContent>

          {canViewUsage ? (
            <TabsContent value="usage">
              <AiUsageContent />
            </TabsContent>
          ) : null}
        </Tabs>
      </PageContent>
    </PageShell>
  )
}
