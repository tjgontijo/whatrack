import { TeamAccessContent } from '@/components/dashboard/account/team-access-content'

export default function TeamAccessPage() {
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
