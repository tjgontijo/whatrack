import { redirect } from 'next/navigation'

import { AiCopilotPageContent } from '@/components/dashboard/ai/ai-copilot-page-content'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

type AiPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AiPage({ searchParams }: AiPageProps) {
  const access = await requireWorkspacePageAccess({ permissions: 'view:ai' })

  const rawSearchParams = (await searchParams) ?? {}
  const tab = Array.isArray(rawSearchParams.tab) ? rawSearchParams.tab[0] : rawSearchParams.tab

  if (tab === 'usage' && access.role === 'user') {
    redirect('/dashboard/ia')
  }

  return <AiCopilotPageContent initialTab={tab ?? 'approvals'} />
}
