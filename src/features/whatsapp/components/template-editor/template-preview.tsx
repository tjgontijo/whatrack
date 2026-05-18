'use client'

import { ExternalLink, MessageCircle } from 'lucide-react'
import React from 'react'
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
  const resolvedBody =
    samples && Object.keys(samples).length > 0
      ? bodyText.replace(/\{\{([^}]+)\}\}/g, (_, k) => samples[k] || `[${k}]`)
      : bodyText

  const hasContent = resolvedBody.trim() !== ''

  // Resolve buttons: prefer previewButtons array, fall back to legacy props
  const allButtons: PreviewButton[] = previewButtons ?? [
    ...(buttonType === 'URL' && urlButtonText
      ? [{ type: 'URL' as const, text: urlButtonText }]
      : []),
    ...(buttonType === 'REPLY'
      ? replyButtons.map((t) => ({ type: 'REPLY' as const, text: t }))
      : []),
  ]
  const hasButtons = allButtons.length > 0
  const showAsList = allButtons.length > 3
  const visibleButtons = showAsList ? allButtons : allButtons.slice(0, 3)

  if (compact) {
    return (
      <div className='rounded-lg border border-[#303d45] bg-[#0b141a] p-3'>
        {headerText && <p className='mb-1 font-bold text-[#e9edef] text-[12px]'>{headerText}</p>}
        <p className='whitespace-pre-wrap text-[#e9edef] text-[13px] leading-relaxed'>
          {resolvedBody || 'Sua mensagem aparecerá aqui...'}
        </p>
        {footerText && <p className='mt-1 text-[#8696a0] text-[11px]'>{footerText}</p>}
      </div>
    )
  }

  return (
    <div className='w-[420px] overflow-hidden rounded-[40px] border-[6px] border-foreground/10 bg-[#0b141a] shadow-2xl'>
      {/* Phone top bar */}
      <div className='flex items-center gap-3 bg-[#202c33] px-5 py-3'>
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00a884]'>
          <MessageCircle className='h-4 w-4 text-white' />
        </div>
        <div>
          <p className='font-semibold text-[#e9edef] text-[12px]'>Sua Empresa</p>
          <p className='text-[#8696a0] text-[10px]'>online</p>
        </div>
      </div>

      {/* Chat area */}
      <div
        className='min-h-[480px] bg-[#0b141a] px-3 py-4'
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
      >
        {/* Message bubble */}
        <div className='relative'>
          {/* Bubble tail */}
          <div className='absolute top-0 -left-1.5 h-0 w-0 border-t-[8px] border-t-transparent border-r-[#202c33] border-r-[8px]' />

          <div
            className={cn(
              'rounded-lg rounded-tl-none bg-[#202c33] transition-opacity',
              hasContent ? 'opacity-100' : 'opacity-40'
            )}
          >
            {/* Header media placeholder */}
            {headerType && headerType !== 'NONE' && headerType !== 'TEXT' && (
              <div className='flex h-28 items-center justify-center rounded-t-lg rounded-tl-none bg-[#303d45]'>
                <span className='text-[#8696a0] text-[10px] uppercase'>
                  {headerType === 'IMAGE' ? 'Imagem' : headerType === 'VIDEO' ? 'Vídeo' : 'Arquivo'}
                </span>
              </div>
            )}

            <div className='space-y-1 px-3 py-2'>
              {/* Header text */}
              {headerType === 'TEXT' && headerText && (
                <p className='font-bold text-[#e9edef] text-[13px] leading-snug'>{headerText}</p>
              )}

              {/* Body */}
              <p
                className={cn(
                  'whitespace-pre-wrap break-words text-[13px] leading-relaxed',
                  hasContent ? 'text-[#e9edef]' : 'text-[#8696a0] italic'
                )}
              >
                {resolvedBody || 'Sua mensagem aparecerá aqui...'}
              </p>

              {/* Footer */}
              {footerText && <p className='text-[#8696a0] text-[11px]'>{footerText}</p>}

              {/* Timestamp */}
              <div className='flex justify-end'>
                <span className='text-[#8696a0] text-[10px]'>
                  {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Buttons */}
            {hasButtons && (
              <div className='border-[#303d45] border-t'>
                {showAsList ? (
                  /* 4+ buttons: compact list — sem ícone, só label de tipo */
                  <div className='space-y-1.5 px-3 py-2'>
                    {visibleButtons.map((btn, i) => (
                      <div key={i} className='flex items-center gap-2 text-[11px]'>
                        <span
                          className={`shrink-0 font-bold text-[9px] uppercase tracking-wider ${btn.type === 'URL' ? 'text-[#00a884]' : 'text-[#8696a0]'}`}
                        >
                          {btn.type === 'URL' ? 'URL' : 'Reply'}
                        </span>
                        <span className='truncate text-[#00a884]'>{btn.text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* 1-3 buttons: full-width rows */
                  visibleButtons.map((btn, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <div className='border-[#303d45] border-t' />}
                      {btn.type === 'URL' ? (
                        <button className='flex w-full items-center justify-center gap-1.5 px-3 py-2 text-[#00a884] text-[13px]'>
                          <ExternalLink className='h-3.5 w-3.5' />
                          {btn.text}
                        </button>
                      ) : (
                        <button className='w-full px-3 py-2 text-center text-[#00a884] text-[13px]'>
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
      <div className='flex items-center gap-2 bg-[#202c33] px-3 py-2'>
        <div className='h-7 flex-1 rounded-full bg-[#2a3942]' />
        <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00a884]'>
          <MessageCircle className='h-3.5 w-3.5 text-white' />
        </div>
      </div>
    </div>
  )
}
