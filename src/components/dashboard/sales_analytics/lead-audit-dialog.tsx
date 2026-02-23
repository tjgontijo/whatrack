'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { leadAuditResponseSchema, type LeadAuditResponse } from '@/schemas/lead-audit'
import { applyWhatsAppMask } from '@/lib/mask/phone-mask'

async function fetchLeadAudits(leadId: string): Promise<LeadAuditResponse> {
  const response = await fetch(`/api/v1/leads/${leadId}/audits`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Não foi possível carregar as auditorias do lead')
  }

  const json = await response.json()
  return leadAuditResponseSchema.parse(json)
}

function normalizeMarkdown(value: string | null | undefined) {
  if (!value) return ''
  return value.replace(/\r\n/g, '\n').replace(/\t/g, '  ').trim()
}

const markdownComponents: Components = {
  h1: ({ node, ...props }) => <h2 className="text-foreground text-xl font-semibold" {...props} />, // eslint-disable-line @typescript-eslint/no-unused-vars
  h2: ({ node, ...props }) => <h3 className="text-foreground text-lg font-semibold" {...props} />, // eslint-disable-line @typescript-eslint/no-unused-vars
  h3: ({ node, ...props }) => <h4 className="text-foreground text-base font-semibold" {...props} />, // eslint-disable-line @typescript-eslint/no-unused-vars
  h4: ({ node, ...props }) => <h5 className="text-foreground text-base font-medium" {...props} />, // eslint-disable-line @typescript-eslint/no-unused-vars
  h5: ({ node, ...props }) => <h6 className="text-foreground text-sm font-medium" {...props} />, // eslint-disable-line @typescript-eslint/no-unused-vars
  h6: ({ node, ...props }) => <p className="text-foreground text-sm font-medium" {...props} />, // eslint-disable-line @typescript-eslint/no-unused-vars
  p: ({ node, ...props }) => <p className="text-muted-foreground leading-relaxed" {...props} />, // eslint-disable-line @typescript-eslint/no-unused-vars
  strong: ({ node, ...props }) => <strong className="text-foreground font-semibold" {...props} />, // eslint-disable-line @typescript-eslint/no-unused-vars
  em: ({ node, ...props }) => <em className="text-foreground italic" {...props} />, // eslint-disable-line @typescript-eslint/no-unused-vars
  ul: ({ node, ...props }) => (
    <ul className="text-muted-foreground list-disc space-y-2 pl-6" {...props} />
  ), // eslint-disable-line @typescript-eslint/no-unused-vars
  ol: ({ node, ...props }) => (
    <ol className="text-muted-foreground list-decimal space-y-2 pl-6" {...props} />
  ), // eslint-disable-line @typescript-eslint/no-unused-vars
  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />, // eslint-disable-line @typescript-eslint/no-unused-vars
  blockquote: (
    { node, ...props } // eslint-disable-line @typescript-eslint/no-unused-vars
  ) => (
    <blockquote
      className="border-muted-foreground/40 text-muted-foreground border-l-2 pl-4 italic"
      {...props}
    />
  ),
  table: (
    { node, ...props } // eslint-disable-line @typescript-eslint/no-unused-vars
  ) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => <thead className="bg-muted/60" {...props} />, // eslint-disable-line @typescript-eslint/no-unused-vars
  tbody: ({ node, ...props }) => <tbody {...props} />, // eslint-disable-line @typescript-eslint/no-unused-vars
  tr: ({ node, ...props }) => <tr className="border-border/60 border-b" {...props} />, // eslint-disable-line @typescript-eslint/no-unused-vars
  th: ({ node, ...props }) => (
    <th className="text-foreground px-3 py-2 text-left font-medium" {...props} />
  ), // eslint-disable-line @typescript-eslint/no-unused-vars
  td: ({ node, ...props }) => (
    <td className="text-muted-foreground px-3 py-2 align-top" {...props} />
  ), // eslint-disable-line @typescript-eslint/no-unused-vars
  code: (codeProps) => {
    const { inline, className, children, ...props } = codeProps as {
      inline?: boolean
      className?: string
      children?: React.ReactNode
    }

    if (inline) {
      return (
        <code
          className="bg-muted text-foreground rounded px-1.5 py-0.5 text-xs font-medium"
          {...props}
        >
          {children}
        </code>
      )
    }

    return (
      <pre className="bg-muted text-foreground overflow-x-auto rounded-md px-4 py-3 text-sm">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    )
  },
}

export type LeadAuditDialogProps = {
  leadId: string
  leadName: string | null
  leadPhone: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeadAuditDialog({
  leadId,
  leadName,
  leadPhone,
  open,
  onOpenChange,
}: LeadAuditDialogProps) {
  const { data, isLoading, isError, refetch, error } = useQuery({
    queryKey: ['lead-audits', leadId],
    queryFn: () => fetchLeadAudits(leadId),
    enabled: open && Boolean(leadId),
    staleTime: 10_000,
  })

  const formattedPhone = React.useMemo(() => {
    return leadPhone ? applyWhatsAppMask(leadPhone) : '—'
  }, [leadPhone])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] min-h-[60vh] w-full overflow-y-auto p-6 sm:w-[60vw] sm:max-w-none">
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="bg-muted/50 border-b px-0 pb-4">
            <DialogTitle className="text-lg font-semibold">
              {leadName || 'Lead sem nome'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Telefone: {formattedPhone}
            </DialogDescription>
          </DialogHeader>

          {isLoading && (
            <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 p-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando auditorias…
            </div>
          )}

          {isError && !isLoading && (
            <div className="text-destructive flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <p>{(error as Error | undefined)?.message ?? 'Erro ao carregar auditorias.'}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-sm font-medium underline"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!isLoading && !isError && data && (
            <div className="flex min-h-0 flex-1 flex-col py-6">
              {data.audits.length === 0 ? (
                <div className="text-muted-foreground flex flex-1 items-center justify-center p-8 text-sm">
                  Nenhuma auditoria registrada para este lead.
                </div>
              ) : (
                <Accordion type="multiple" className="mx-auto w-full max-w-3xl space-y-3">
                  {(() => {
                    const qualyAudits = data.audits
                      .map((audit) => normalizeMarkdown(audit.qualy_audit))
                      .filter((content) => content.length > 0)

                    const timeAudits = data.audits
                      .map((audit) => normalizeMarkdown(audit.time_audit))
                      .filter((content) => content.length > 0)

                    const hasQualy = qualyAudits.length > 0
                    const hasTime = timeAudits.length > 0

                    if (!hasQualy && !hasTime) {
                      return (
                        <div className="border-muted-foreground/40 bg-muted/20 text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
                          Nenhum conteúdo de auditoria disponível para este lead.
                        </div>
                      )
                    }

                    return (
                      <>
                        {hasQualy ? (
                          <AccordionItem
                            value="qualy"
                            className="bg-background/60 rounded-lg border"
                          >
                            <AccordionTrigger className="px-4 py-3 text-left text-sm font-semibold">
                              Auditoria de Atendimento
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 pt-0">
                              <div className="space-y-6">
                                {qualyAudits.map((content, index) => (
                                  <div key={`qualy-${index}`} className="space-y-3">
                                    {qualyAudits.length > 1 ? (
                                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                                        Bloco {index + 1}
                                      </p>
                                    ) : null}
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      components={markdownComponents}
                                    >
                                      {content}
                                    </ReactMarkdown>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ) : null}

                        {hasTime ? (
                          <AccordionItem
                            value="time"
                            className="bg-background/60 rounded-lg border"
                          >
                            <AccordionTrigger className="px-4 py-3 text-left text-sm font-semibold">
                              Auditoria de Tempo
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 pt-0">
                              <div className="space-y-6">
                                {timeAudits.map((content, index) => (
                                  <div key={`time-${index}`} className="space-y-3">
                                    {timeAudits.length > 1 ? (
                                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                                        Bloco {index + 1}
                                      </p>
                                    ) : null}
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      components={markdownComponents}
                                    >
                                      {content}
                                    </ReactMarkdown>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ) : null}
                      </>
                    )
                  })()}
                </Accordion>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
