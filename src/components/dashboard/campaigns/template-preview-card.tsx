'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WhatsAppTemplate } from '@/types/whatsapp/whatsapp'

interface TemplatePreviewCardProps {
  template: WhatsAppTemplate | null
}

export function TemplatePreviewCard({ template }: TemplatePreviewCardProps) {
  if (!template) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="pt-6 text-center text-muted-foreground">
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
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{template.name}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {template.language || 'pt-BR'} • {template.category || 'Marketing'}
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-white border p-4 space-y-3 max-w-sm">
          {/* Header */}
          {headerComponent && (
            <div className="space-y-1">
              {headerComponent.format === 'TEXT' && (
                <p className="text-sm font-semibold">{headerComponent.text || '—'}</p>
              )}
              {headerComponent.format === 'IMAGE' && (
                <div className="bg-gray-200 rounded h-40 flex items-center justify-center text-xs text-muted-foreground">
                  Imagem
                </div>
              )}
              {headerComponent.format === 'VIDEO' && (
                <div className="bg-gray-200 rounded h-40 flex items-center justify-center text-xs text-muted-foreground">
                  Vídeo
                </div>
              )}
              {headerComponent.format === 'DOCUMENT' && (
                <div className="bg-gray-200 rounded h-16 flex items-center justify-center text-xs text-muted-foreground">
                  Documento
                </div>
              )}
            </div>
          )}

          {/* Body */}
          {bodyComponent && (
            <div className="text-sm text-gray-800 whitespace-pre-wrap">
              {(bodyComponent.text || '')
                .replace(/\{\{\s*\d+\s*\}\}/g, (match) => {
                  const varNum = match.match(/\d+/)?.[0] || match
                  return `[variável ${varNum}]`
                })}
            </div>
          )}

          {/* Buttons */}
          {buttons.length > 0 && (
            <div className="flex flex-col gap-2 pt-2">
              {buttons.map((btn, idx) => (
                <button
                  key={idx}
                  disabled
                  className="py-2 px-3 border border-primary rounded text-sm text-primary bg-white hover:bg-primary/5 transition-colors text-center"
                >
                  {btn.text || `Botão ${idx + 1}`}
                </button>
              ))}
            </div>
          )}

          {/* Footer */}
          {footerComponent && (
            <p className="text-xs text-gray-500 pt-2">{footerComponent.text || '—'}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
