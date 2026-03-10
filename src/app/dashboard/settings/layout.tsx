import type { ReactNode } from 'react'
import { getServerSession } from '@/server/auth/server-session'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'
import { listEffectivePermissionsForUser } from '@/server/organization/organization-rbac.service'
import type { Permission } from '@/lib/auth/rbac/roles'
import { SettingsNav } from '@/components/dashboard/settings/settings-nav'

type SettingsLayoutProps = {
  children: ReactNode
}

export default async function SettingsLayout({ children }: SettingsLayoutProps) {
  const access = await requireWorkspacePageAccess()
  const session = await getServerSession()

  const effectivePermissions = await listEffectivePermissionsForUser({
    userId: access.userId,
    organizationId: access.organizationId,
  })

  const permissionSet = new Set(effectivePermissions?.effectivePermissions ?? [])
  const can = (permission: Permission) => permissionSet.has(permission)
  const isWorkspaceOwner = access.role === 'owner'
  const isGlobalAdmin = session?.user?.role === 'owner' || session?.user?.role === 'admin'
  const isGlobalOwner = session?.user?.role === 'owner'

  const personalItems = [
    { label: 'Perfil', href: '/dashboard/settings/profile' },
    { label: 'Segurança', href: '/dashboard/settings/profile#seguranca' },
  ]

  const workspaceItems = [
    { label: 'Organização', href: '/dashboard/settings/organization', show: can('manage:organization') },
    { label: 'Equipe', href: '/dashboard/settings/team', show: can('manage:members') },
    { label: 'Integrações', href: '/dashboard/settings/integrations', show: can('manage:integrations') },
    { label: 'Pipeline', href: '/dashboard/settings/pipeline', show: can('manage:settings') },
    { label: 'IA Studio', href: '/dashboard/settings/ai-studio', show: can('manage:ai') },
    { label: 'Catálogo', href: '/dashboard/settings/catalog', show: can('manage:items') },
    { label: 'Assinatura', href: '/dashboard/settings/subscription', show: isWorkspaceOwner },
    { label: 'Auditoria', href: '/dashboard/settings/audit', show: can('view:audit') },
  ].filter((item) => item.show)

  const systemItems = [
    { label: 'Planos e Cobrança', href: '/dashboard/settings/billing', show: isGlobalAdmin },
    { label: 'Design System', href: '/dashboard/design-system', show: isGlobalOwner },
  ].filter((item) => item.show)

  const sections = [
    { title: 'Conta pessoal', items: personalItems },
    ...(workspaceItems.length > 0 ? [{ title: 'Workspace', items: workspaceItems }] : []),
    ...(systemItems.length > 0 ? [{ title: 'Sistema', items: systemItems }] : []),
  ]

  return (
    <div className="flex min-h-full gap-6">
      <aside className="bg-background hidden h-fit w-64 shrink-0 rounded-xl border p-4 md:sticky md:top-4 md:block">
        <SettingsNav sections={sections} />
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
