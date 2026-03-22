'use client'

import React from 'react'
import { ExternalLink, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

interface PreviewButton {
  type: 'URL' | 'REPLY'
  text: string
}

interface TemplatePreviewProps {
  // Full-screen editor props
  headerType?: string
  headerText?: string
  bodyText: string
  footerText?: string
  // New: multi-button support
  previewButtons?: PreviewButton[]
  // Legacy single-type props (still supported for compact/other usages)
  buttonType?: string
  urlButtonText?: string
  replyButtons?: string[]
  // Legacy compact props
  templateName?: string
  samples?: Record<string, string>
  compact?: boolean
}

export function TemplatePreview({
  headerType = 'NONE',
  headerText = '',
  bodyText,
  footerText = '',
  previewButtons,
  buttonType = 'NONE',
  urlButtonText = '',
  replyButtons = [],
  templateName,
  samples = {},
  compact = false,
}: TemplatePreviewProps) {
  // Legacy: apply samples substitution if samples provided (old compact usage)
  const resolvedBody = samples && Object.keys(samples).length > 0
    ? bodyText.replace(/\{\{([^}]+)\}\}/g, (_, k) => samples[k] || `[${k}]`)
    : bodyText

  const hasContent = resolvedBody.trim() !== ''

  // Resolve buttons: prefer previewButtons array, fall back to legacy props
  const allButtons: PreviewButton[] = previewButtons ?? [
    ...(buttonType === 'URL' && urlButtonText ? [{ type: 'URL' as const, text: urlButtonText }] : []),
    ...(buttonType === 'REPLY' ? replyButtons.map((t) => ({ type: 'REPLY' as const, text: t })) : []),
  ]
  const hasButtons = allButtons.length > 0
  const showAsList = allButtons.length > 3
  const visibleButtons = showAsList ? allButtons : allButtons.slice(0, 3)

  if (compact) {
    return (
      <div className="rounded-lg border border-[#303d45] bg-[#0b141a] p-3">
        {headerText && <p className="mb-1 text-[12px] font-bold text-[#e9edef]">{headerText}</p>}
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#e9edef]">
          {resolvedBody || 'Sua mensagem aparecerá aqui...'}
        </p>
        {footerText && <p className="mt-1 text-[11px] text-[#8696a0]">{footerText}</p>}
      </div>
    )
  }

  return (
    <div className="w-[420px] overflow-hidden rounded-[40px] border-[6px] border-foreground/10 bg-[#0b141a] shadow-2xl">
      {/* Phone top bar */}
      <div className="bg-[#202c33] px-5 py-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-[#00a884] flex items-center justify-center shrink-0">
          <MessageCircle className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-[12px] font-semibold text-[#e9edef]">Sua Empresa</p>
          <p className="text-[10px] text-[#8696a0]">online</p>
        </div>
      </div>

      {/* Chat area */}
      <div className="bg-[#0b141a] px-3 py-4 min-h-[480px]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '20px 20px' }}
      >
        {/* Message bubble */}
        <div className="relative">
          {/* Bubble tail */}
          <div className="absolute -left-1.5 top-0 h-0 w-0 border-r-[8px] border-t-[8px] border-r-[#202c33] border-t-transparent" />

          <div
            className={cn(
              'rounded-lg rounded-tl-none bg-[#202c33] transition-opacity',
              hasContent ? 'opacity-100' : 'opacity-40'
            )}
          >
            {/* Header media placeholder */}
            {headerType && headerType !== 'NONE' && headerType !== 'TEXT' && (
              <div className="bg-[#303d45] rounded-t-lg rounded-tl-none h-28 flex items-center justify-center">
                <span className="text-[10px] text-[#8696a0] uppercase">
                  {headerType === 'IMAGE' ? 'Imagem' : headerType === 'VIDEO' ? 'Vídeo' : 'Arquivo'}
                </span>
              </div>
            )}

            <div className="px-3 py-2 space-y-1">
              {/* Header text */}
              {headerType === 'TEXT' && headerText && (
                <p className="text-[13px] font-bold text-[#e9edef] leading-snug">{headerText}</p>
              )}

              {/* Body */}
              <p className={cn(
                'whitespace-pre-wrap break-words text-[13px] leading-relaxed',
                hasContent ? 'text-[#e9edef]' : 'italic text-[#8696a0]'
              )}>
                {resolvedBody || 'Sua mensagem aparecerá aqui...'}
              </p>

              {/* Footer */}
              {footerText && (
                <p className="text-[11px] text-[#8696a0]">{footerText}</p>
              )}

              {/* Timestamp */}
              <div className="flex justify-end">
                <span className="text-[10px] text-[#8696a0]">
                  {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Buttons */}
            {hasButtons && (
              <div className="border-t border-[#303d45]">
                {showAsList ? (
                  /* 4+ buttons: compact list — sem ícone, só label de tipo */
                  <div className="px-3 py-2 space-y-1.5">
                    {visibleButtons.map((btn, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider ${btn.type === 'URL' ? 'text-[#00a884]' : 'text-[#8696a0]'}`}>
                          {btn.type === 'URL' ? 'URL' : 'Reply'}
                        </span>
                        <span className="truncate text-[#00a884]">{btn.text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* 1-3 buttons: full-width rows */
                  visibleButtons.map((btn, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <div className="border-t border-[#303d45]" />}
                      {btn.type === 'URL' ? (
                        <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] text-[#00a884]">
                          <ExternalLink className="h-3.5 w-3.5" />
                          {btn.text}
                        </button>
                      ) : (
                        <button className="w-full px-3 py-2 text-[13px] text-[#00a884] text-center">
                          {btn.text}
                        </button>
                      )}
                    </React.Fragment>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Phone bottom bar */}
      <div className="bg-[#202c33] px-3 py-2 flex items-center gap-2">
        <div className="flex-1 bg-[#2a3942] rounded-full h-7" />
        <div className="h-7 w-7 rounded-full bg-[#00a884] flex items-center justify-center shrink-0">
          <MessageCircle className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
    </div>
  )
}
