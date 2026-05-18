import { FormSkeleton } from '@/features/dashboard/components/states/form-skeleton'

export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Organização</h2>
        <p className="text-sm text-muted-foreground">Configurações da sua organização.</p>
      </div>
      <FormSkeleton fields={4} />
    </div>
  )
}
