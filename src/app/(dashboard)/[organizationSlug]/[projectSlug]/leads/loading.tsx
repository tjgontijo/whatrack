import { TableSkeleton } from '@/features/dashboard/components/states/table-skeleton'

export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Leads</h2>
          <p className="text-sm text-muted-foreground">Visualize e gerencie seus contatos.</p>
        </div>
      </div>
      <TableSkeleton rows={10} columns={4} />
    </div>
  )
}
