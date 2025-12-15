'use client'

import { formatDateTime } from '@/lib/mask/formatters'

type SalesAuditItem = {
  id: string
  created_at: string
  qualy_audit: string | null
  time_audit: string | null
  conversation: unknown | null
}

export type SalesAuditListProps = {
  items: SalesAuditItem[]
}

export function SalesAuditList({ items }: SalesAuditListProps) {
  if (!items.length) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Nenhuma auditoria registrada.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((audit) => (
        <div key={audit.id} className="rounded-md border bg-muted/20 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-foreground">{audit.qualy_audit ?? 'Sem qualificação'}</span>
            <span className="text-xs text-muted-foreground">{formatDateTime(audit.created_at)}</span>
          </div>
          <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
            {audit.time_audit && (
              <div>
                <span className="font-medium text-foreground">Tempo de atendimento:</span> {audit.time_audit}
              </div>
            )}
            {audit.conversation != null && (
              <details className="group">
                <summary className="cursor-pointer font-medium text-foreground">Histórico</summary>
                <pre className="mt-1 max-h-48 overflow-auto rounded bg-background/60 p-2 text-[11px]">
                  {formatConversation(audit.conversation)}
                </pre>
              </details>
            )}
          </dl>
        </div>
      ))}
    </div>
  )
}

function formatConversation(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    console.warn('[SalesAuditList] conversation parse error', error)
    return String(value)
  }
}
