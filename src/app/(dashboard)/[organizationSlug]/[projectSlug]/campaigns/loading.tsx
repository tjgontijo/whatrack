import { TableSkeleton } from '@/components/skeletons'

export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Campanhas</h2>
          <p className="text-sm text-muted-foreground">Gerencie suas campanhas de WhatsApp.</p>
        </div>
      </div>
      <TableSkeleton rows={6} columns={5} />
    </div>
  )
}
