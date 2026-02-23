'use client'

import * as React from 'react'
import { Check, CheckCheck } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Message } from './types'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'OUTBOUND'

  return (
    <div className={cn('mb-4 flex w-full', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'group relative max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all',
          isOutbound
            ? 'bg-primary text-primary-foreground ml-12 rounded-tr-none'
            : 'bg-card border-border/60 mr-12 rounded-tl-none border'
        )}
      >
        {/* Content */}
        <div className="whitespace-pre-wrap break-words leading-relaxed">{message.body}</div>

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
            <div className="flex items-center">
              {message.status === 'read' ? (
                <CheckCheck className="h-3 w-3 text-emerald-300" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </div>
          )}
        </div>

        {/* Visual Arrow Tail */}
        <div
          className={cn(
            'absolute top-0 h-2 w-2',
            isOutbound
              ? 'border-l-primary right-[-8px] border-b-[8px] border-l-[8px] border-b-transparent'
              : 'border-r-card left-[-8px] border-b-[8px] border-r-[8px] border-b-transparent'
          )}
        />
      </div>
    </div>
  )
}
