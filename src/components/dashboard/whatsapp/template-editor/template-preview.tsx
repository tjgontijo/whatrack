'use client'

import React from 'react'
import { ExternalLink, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

interface TemplatePreviewProps {
  // Full-screen editor props
  headerType?: string
  headerText?: string
  bodyText: string
  footerText?: string
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
  const hasButtons = buttonType !== 'NONE' && (urlButtonText || replyButtons.length > 0)

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
                {buttonType === 'URL' && urlButtonText && (
                  <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] text-[#00a884]">
                    <ExternalLink className="h-3.5 w-3.5" />
                    {urlButtonText}
                  </button>
                )}
                {buttonType === 'REPLY' && replyButtons.map((btn, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <div className="border-t border-[#303d45]" />}
                    <button className="w-full px-3 py-2 text-[13px] text-[#00a884] text-center">
                      {btn}
                    </button>
                  </React.Fragment>
                ))}
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
