import { AiSettingsPage } from '@/components/dashboard/settings/ai-settings-page'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

type AiStudioPageProps = {
  params: Promise<{ organizationSlug: string }>
}

export default async function AiStudioPage({ params }: AiStudioPageProps) {
  const { organizationSlug } = await params
  await requireWorkspacePageAccess({ permissions: 'manage:ai', organizationSlug })

  return <AiSettingsPage />
}
