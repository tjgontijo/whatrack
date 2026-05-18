'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WhatsAppTemplate } from '@/features/whatsapp/types/whatsapp'

interface TemplatePreviewCardProps {
  template?: WhatsAppTemplate | null
}

export function TemplatePreviewCard({ template }: TemplatePreviewCardProps) {
  if (!template) {
    return (
      <Card className='bg-muted/30'>
        <CardContent className='pt-6 text-center text-muted-foreground'>
          Selecione um template para visualizar
        </CardContent>
      </Card>
    )
  }

  const components = template.components || []
  const headerComponent = components.find((c) => c.type === 'HEADER')
  const bodyComponent = components.find((c) => c.type === 'BODY')
  const footerComponent = components.find((c) => c.type === 'FOOTER')
  const buttons = components.find((c) => c.type === 'BUTTONS')?.buttons || []

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-sm'>{template.name}</CardTitle>
        <p className='text-muted-foreground text-xs'>
          {template.language || 'pt-BR'} • {template.category || 'Marketing'}
        </p>
      </CardHeader>
      <CardContent>
        <div className='max-w-sm space-y-3 rounded-lg border bg-white p-4'>
          {/* Header */}
          {headerComponent && (
            <div className='space-y-1'>
              {headerComponent.format === 'TEXT' && (
                <p className='font-semibold text-sm'>{headerComponent.text || '—'}</p>
              )}
              {headerComponent.format === 'IMAGE' && (
                <div className='flex h-40 items-center justify-center rounded bg-gray-200 text-muted-foreground text-xs'>
                  Imagem
                </div>
              )}
              {headerComponent.format === 'VIDEO' && (
                <div className='flex h-40 items-center justify-center rounded bg-gray-200 text-muted-foreground text-xs'>
                  Vídeo
                </div>
              )}
              {headerComponent.format === 'DOCUMENT' && (
                <div className='flex h-16 items-center justify-center rounded bg-gray-200 text-muted-foreground text-xs'>
                  Documento
                </div>
              )}
            </div>
          )}

          {/* Body */}
          {bodyComponent && (
            <div className='whitespace-pre-wrap text-gray-800 text-sm'>
              {(bodyComponent.text || '').replace(/\{\{\s*\d+\s*\}\}/g, (match) => {
                const varNum = match.match(/\d+/)?.[0] || match
                return `[variável ${varNum}]`
              })}
            </div>
          )}

          {/* Buttons */}
          {buttons.length > 0 && (
            <div className='flex flex-col gap-2 pt-2'>
              {buttons.map((btn, idx) => (
                <button
                  key={idx}
                  disabled
                  className='rounded border border-primary bg-white px-3 py-2 text-center text-primary text-sm transition-colors hover:bg-primary/5'
                >
                  {btn.text || `Botão ${idx + 1}`}
                </button>
              ))}
            </div>
          )}

          {/* Footer */}
          {footerComponent && (
            <p className='pt-2 text-gray-500 text-xs'>{footerComponent.text || '—'}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
