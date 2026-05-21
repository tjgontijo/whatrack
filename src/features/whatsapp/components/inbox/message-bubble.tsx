'use client'

import * as React from 'react'
import { Check, CheckCheck, Mic, FileText, ChevronDown, ChevronUp } from 'lucide-react'

import { cn } from '@/lib/utils/utils'
import type { Message } from './types'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [isTranscriptionOpen, setIsTranscriptionOpen] = React.useState(false)
  
  const isOutbound = message.direction === 'OUTBOUND'
  const isAudio = message.type === 'audio' || message.type === 'voice'
  const mediaId = message.mediaUrl?.startsWith('meta_id:') 
    ? message.mediaUrl.replace('meta_id:', '') 
    : message.mediaUrl?.startsWith('r2:')
      ? message.mediaUrl.replace('r2:', '')
      : null

  const hasTranscription = isAudio && message.body && message.body !== 'Áudio'

  return (
    <div className={cn('mb-4 flex w-full', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'group relative max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all',
          isOutbound
            ? 'ml-12 rounded-tr-none bg-primary text-primary-foreground'
            : 'mr-12 rounded-tl-none border border-border/60 bg-card'
        )}
      >
        {/* Audio Player Layout */}
        {isAudio && mediaId && (
          <div className="flex flex-col gap-2 min-w-[260px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 opacity-90">
                <Mic className={cn("h-4 w-4", isOutbound ? "text-primary-foreground" : "text-primary")} />
                <span className="text-[11px] font-medium uppercase tracking-tight opacity-70">Mensagem de voz</span>
              </div>
              
              {hasTranscription && (
                <button
                  onClick={() => setIsTranscriptionOpen(!isTranscriptionOpen)}
                  title={isTranscriptionOpen ? 'Ocultar transcrição' : 'Ver transcrição'}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full transition-all hover:bg-black/5 active:scale-90",
                    isTranscriptionOpen 
                      ? (isOutbound ? "bg-primary-foreground/20" : "bg-primary/10") 
                      : "opacity-50 hover:opacity-100"
                  )}
                >
                  <FileText className={cn("h-3.5 w-3.5", isOutbound ? "text-primary-foreground" : "text-primary")} />
                </button>
              )}
            </div>

            <audio 
              controls 
              className={cn(
                "h-8 w-full",
                isOutbound ? "filter invert brightness-200" : ""
              )}
            >
              <source src={`/api/v1/whatsapp/media/${mediaId}`} type="audio/ogg" />
            </audio>

            {/* Transcription Content (Collapsible) */}
            {isTranscriptionOpen && hasTranscription && (
              <div className={cn(
                "mt-1 animate-in fade-in zoom-in-95 duration-200 text-xs leading-relaxed italic opacity-90",
                isOutbound ? "text-primary-foreground/90" : "text-muted-foreground"
              )}>
                <div className="mb-1 flex items-center gap-1 not-italic font-bold uppercase text-[8px] tracking-widest opacity-40">
                  <span>Transcrição IA</span>
                </div>
                {message.body}
              </div>
            )}
          </div>
        )}

        {/* Regular Text Content */}
        {!isAudio && (
          <div className='whitespace-pre-wrap break-words leading-relaxed'>{message.body}</div>
        )}

        {/* Footer (Time + Status) */}
        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-1.5 text-[10px] opacity-70',
            isOutbound ? 'text-primary-foreground/90' : 'text-muted-foreground'
          )}
        >
          <span>
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          {isOutbound && (
            <div className='flex items-center'>
              {message.status === 'read' ? (
                <CheckCheck className='h-3 w-3 text-emerald-300' />
              ) : message.status === 'delivered' ? (
                <CheckCheck className='h-3 w-3' />
              ) : (
                <Check className='h-3 w-3' />
              )}
            </div>
          )}
        </div>

        {/* Visual Arrow Tail */}
        <div
          className={cn(
            'absolute top-0 h-2 w-2',
            isOutbound
              ? 'right-[-8px] border-b-[8px] border-b-transparent border-l-[8px] border-l-primary'
              : 'left-[-8px] border-r-[8px] border-r-card border-b-[8px] border-b-transparent'
          )}
        />
      </div>
    </div>
  )
}
