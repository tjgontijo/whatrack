import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'
import { TeamAccessContent } from '@/components/dashboard/account/team-access-content'

export default async function TeamAccessPage() {
  await requireWorkspacePageAccess({ permissions: 'manage:members' })

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pt-8 first:pt-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organização</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie membros, papéis e permissões da organização ativa.
        </p>
      </div>

      <TeamAccessContent />
    </div>
  )
}
