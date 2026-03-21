'use client'

import { useState } from 'react'

import { SectionPageShell, type SectionTab } from '@/components/dashboard/layout/section-page-shell'
import { useAuthorization } from '@/hooks/auth/use-authorization'
import { AiApprovalsContent } from './ai-approvals-content'
import { AiUsageContent } from './ai-usage-content'

export function AiCopilotPageContent() {
  const authorization = useAuthorization()
  const canViewUsage = authorization.isLoading || authorization.isAdmin

  const tabs: SectionTab[] = [
    { key: 'approvals', label: 'Aprovações' },
    ...(canViewUsage ? [{ key: 'usage', label: 'Uso e custo' }] : []),
  ]

  const [activeTab, setActiveTab] = useState('approvals')

  return (
    <SectionPageShell
      title="IA Copilot"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {activeTab === 'approvals' ? <AiApprovalsContent /> : <AiUsageContent />}
    </SectionPageShell>
  )
}
