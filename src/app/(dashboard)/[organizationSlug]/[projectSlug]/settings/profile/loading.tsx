import { FormSkeleton } from '@/features/dashboard/components/states/form-skeleton'

export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Meu Perfil</h2>
        <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais.</p>
      </div>
      <FormSkeleton fields={3} />
    </div>
  )
}
