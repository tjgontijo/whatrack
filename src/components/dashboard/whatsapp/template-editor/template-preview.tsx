'use client'

import React from 'react'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

interface TemplatePreviewProps {
  templateName?: string
  headerText?: string
  bodyText: string
  footerText?: string
  samples?: Record<string, string>
  compact?: boolean
}

export function TemplatePreview({
  templateName,
  headerText,
  bodyText,
  footerText,
  samples = {},
  compact = false,
}: TemplatePreviewProps) {
  const getPreviewText = () => {
    if (!bodyText || bodyText.trim() === '') {
      return 'Sua mensagem aparecerá aqui...'
    }

    let preview = bodyText
    const matches = bodyText.match(/\{\{[\w.]+\}\}/g) || []

    matches.forEach((match) => {
      const varKey = match.replace(/\{\{|\}\}/g, '')
      const sample = samples[varKey] || match
      preview = preview.replaceAll(match, sample)
    })

    return preview
  }

  const previewText = getPreviewText()
  const hasContent = bodyText && bodyText.trim() !== ''

  if (compact) {
    return (
      <div className="relative rounded-lg border border-[#303d45] bg-[#0b141a] p-3">
        {headerText && <p className="mb-1 text-[12px] font-bold text-[#e9edef]">{headerText}</p>}
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#e9edef]">
          {previewText}
        </p>
        {footerText && <p className="mt-1 text-[11px] text-[#8696a0]">{footerText}</p>}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gradient-to-b from-[#075E54] to-[#128C7E] p-6 text-white">
      {/* Header Simulator */}
      <div className="mb-6 flex items-center gap-3">
        <MessageCircle className="h-5 w-5" />
        <div>
          <h3 className="text-sm font-semibold">Preview da Mensagem</h3>
          <p className="text-xs opacity-75">Como seu cliente verá no WhatsApp</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col justify-center overflow-y-auto pb-8 pt-4">
        <div className="relative w-full">
          <div className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wider text-white/60">
            Sua Empresa
          </div>

          <div
            className={cn(
              'relative rounded-lg rounded-tl-none border border-white/5 bg-[#202c33] p-4 shadow-xl transition-all duration-300',
              hasContent ? 'scale-100 opacity-100' : 'scale-95 opacity-40'
            )}
          >
            {/* Bubble tail */}
            <div className="absolute -left-2 top-0 h-0 w-0 border-r-[12px] border-t-[12px] border-r-transparent border-t-[#202c33]"></div>

            {/* Template Identifier (Optional in reality but good for user) */}
            {templateName && !headerText && (
              <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#00a884] opacity-90">
                {templateName}
              </h4>
            )}

            {/* Official Header */}
            {headerText && (
              <h4 className="mb-1.5 text-[14px] font-bold leading-tight text-[#e9edef]">
                {headerText}
              </h4>
            )}

            {/* Body */}
            <p
              className={cn(
                'whitespace-pre-wrap break-words text-[14px] leading-relaxed',
                hasContent ? 'text-[#e9edef]' : 'italic text-gray-500'
              )}
            >
              {previewText}
            </p>

            {/* Official Footer */}
            {footerText && (
              <p className="mt-1.5 text-[12px] leading-snug text-[#8696a0]">{footerText}</p>
            )}

            <div className="mt-2 flex items-center justify-end">
              <span className="text-[10px] font-medium text-[#8696a0]">
                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="mt-auto shrink-0 border-t border-white/10 pt-4">
        <p className="text-center text-xs font-medium text-white/50">
          Simulação de interface WhatsApp
        </p>
      </div>
    </div>
  )
}
