import { redirect } from 'next/navigation'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

type Props = { params: Promise<{ organizationSlug: string; projectSlug: string }> }

export default async function IntegrationsPage({ params }: Props) {
  const { organizationSlug, projectSlug } = await params
  await requireWorkspacePageAccess({ permissions: 'manage:integrations', organizationSlug })
  redirect(`/${organizationSlug}/${projectSlug}/settings/whatsapp`)
}
