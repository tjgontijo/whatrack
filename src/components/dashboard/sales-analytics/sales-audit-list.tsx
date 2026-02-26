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
      <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
        Nenhuma auditoria registrada.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((audit) => (
        <div key={audit.id} className="bg-muted/20 rounded-md border p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-foreground font-semibold">
              {audit.qualy_audit ?? 'Sem qualificação'}
            </span>
            <span className="text-muted-foreground text-xs">
              {formatDateTime(audit.created_at)}
            </span>
          </div>
          <dl className="text-muted-foreground mt-2 space-y-1 text-xs">
            {audit.time_audit && (
              <div>
                <span className="text-foreground font-medium">Tempo de atendimento:</span>{' '}
                {audit.time_audit}
              </div>
            )}
            {audit.conversation != null && (
              <details className="group">
                <summary className="text-foreground cursor-pointer font-medium">Histórico</summary>
                <pre className="bg-background/60 mt-1 max-h-48 overflow-auto rounded p-2 text-[11px]">
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
