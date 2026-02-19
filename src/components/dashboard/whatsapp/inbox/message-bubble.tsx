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
        <div className={cn(
            "flex w-full mb-4",
            isOutbound ? "justify-end" : "justify-start"
        )}>
            <div className={cn(
                "max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm text-sm relative group transition-all",
                isOutbound
                    ? "bg-primary text-primary-foreground rounded-tr-none ml-12"
                    : "bg-card border border-border/60 rounded-tl-none mr-12"
            )}>
                {/* Content */}
                <div className="whitespace-pre-wrap break-words leading-relaxed">
                    {message.body}
                </div>

                {/* Footer (Time + Status) */}
                <div className={cn(
                    "flex items-center gap-1.5 justify-end mt-1 opacity-70 text-[10px]",
                    isOutbound ? "text-primary-foreground/90" : "text-muted-foreground"
                )}>
                    <span>
                        {new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
                <div className={cn(
                    "absolute top-0 w-2 h-2",
                    isOutbound
                        ? "right-[-8px] border-l-[8px] border-l-primary border-b-[8px] border-b-transparent"
                        : "left-[-8px] border-r-[8px] border-r-card border-b-[8px] border-b-transparent"
                )} />
            </div>
        </div>
    )
}
