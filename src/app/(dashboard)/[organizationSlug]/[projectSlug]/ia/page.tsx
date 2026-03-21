import { AiCopilotPageContent } from '@/components/dashboard/ai/ai-copilot-page-content'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

type AiPageProps = {
  params: Promise<{ organizationSlug: string }>
}

export default async function AiPage({ params }: AiPageProps) {
  const { organizationSlug } = await params
  await requireWorkspacePageAccess({ permissions: 'view:ai', organizationSlug })
  return <AiCopilotPageContent />
}
