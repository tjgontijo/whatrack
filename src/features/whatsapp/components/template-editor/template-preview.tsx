'use client'

import React from 'react'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TemplatePreviewProps {
    bodyText: string
    samples?: Record<string, string>
    compact?: boolean
}

export function TemplatePreview({ bodyText, samples = {}, compact = false }: TemplatePreviewProps) {
    // Replace placeholders with samples
    const getPreviewText = () => {
        if (!bodyText || bodyText.trim() === '') {
            return 'Sua mensagem aparecerá aqui...'
        }

        let preview = bodyText
        const matches = bodyText.match(/\{\{(\d+)\}\}/g) || []

        matches.forEach(match => {
            const sample = samples[match] || match
            preview = preview.replace(new RegExp(match.replace(/[{}]/g, '\\$&'), 'g'), sample)
        })

        return preview
    }

    const previewText = getPreviewText()
    const hasContent = bodyText && bodyText.trim() !== ''

    if (compact) {
        return (
            <div className="space-y-3">
                {/* Compact Chat Bubble */}
                <div className="relative">
                    <div className="text-[10px] text-muted-foreground mb-1">Sua Empresa</div>

                    <div className={cn(
                        "relative bg-white dark:bg-white rounded-lg rounded-tl-none p-3 shadow-md transition-all duration-300 border",
                        hasContent ? 'opacity-100 scale-100 border-green-200' : 'opacity-50 scale-95 border-gray-200'
                    )}>
                        {/* Bubble tail */}
                        <div className="absolute -left-1.5 top-0 w-0 h-0 border-t-[10px] border-t-white border-r-[10px] border-r-transparent"></div>

                        {/* Message content */}
                        <p className={cn(
                            "text-xs leading-relaxed whitespace-pre-wrap break-words",
                            hasContent ? 'text-gray-900' : 'text-gray-500 italic'
                        )}>
                            {previewText}
                        </p>

                        {/* Timestamp */}
                        <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[9px] text-gray-500">
                                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M12.354 4.354a.5.5 0 0 0-.708-.708L5 10.293 1.854 7.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l7-7zm-4.208 7-.896-.897.707-.707.543.543 6.646-6.647a.5.5 0 0 1 .708.708l-7 7a.5.5 0 0 1-.708 0z" />
                                <path d="m5.354 7.146.896.897-.707.707-.897-.896a.5.5 0 1 1 .708-.708z" />
                            </svg>
                        </div>
                    </div>

                    {!hasContent && (
                        <p className="text-[10px] text-muted-foreground text-center mt-2 italic">
                            Digite para visualizar
                        </p>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-gradient-to-b from-[#075E54] to-[#128C7E] p-6 rounded-xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 text-white">
                <MessageCircle className="h-5 w-5" />
                <div>
                    <h3 className="font-semibold text-sm">Prévia da Mensagem</h3>
                    <p className="text-xs opacity-75">Como seu cliente verá no WhatsApp</p>
                </div>
            </div>

            {/* Phone mockup */}
            <div className="flex-1 flex items-center justify-center py-4">
                <div className="w-full max-w-sm">
                    {/* Chat bubble */}
                    <div className="relative">
                        {/* Sender label */}
                        <div className="text-xs text-white/60 mb-1.5 px-1">Sua Empresa</div>

                        {/* Message bubble */}
                        <div className={cn(
                            "relative bg-white dark:bg-white rounded-lg rounded-tl-none p-3 px-4 shadow-lg transition-all duration-300",
                            hasContent ? 'opacity-100 scale-100' : 'opacity-50 scale-95'
                        )}>
                            {/* Bubble tail */}
                            <div className="absolute -left-2 top-0 w-0 h-0 border-t-[12px] border-t-white dark:border-t-white border-r-[12px] border-r-transparent"></div>

                            {/* Message content */}
                            <p className={cn(
                                "text-sm leading-relaxed whitespace-pre-wrap break-words",
                                hasContent ? 'text-gray-900' : 'text-gray-500 italic'
                            )}>
                                {previewText}
                            </p>

                            {/* Timestamp */}
                            <div className="flex items-center justify-end gap-1 mt-1.5">
                                <span className="text-[10px] text-gray-500">
                                    {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {/* Double check mark */}
                                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M12.354 4.354a.5.5 0 0 0-.708-.708L5 10.293 1.854 7.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l7-7zm-4.208 7-.896-.897.707-.707.543.543 6.646-6.647a.5.5 0 0 1 .708.708l-7 7a.5.5 0 0 1-.708 0z" />
                                    <path d="m5.354 7.146.896.897-.707.707-.897-.896a.5.5 0 1 1 .708-.708z" />
                                </svg>
                            </div>
                        </div>

                        {/* Helper hint */}
                        {!hasContent && (
                            <div className="mt-4 text-center animate-pulse">
                                <p className="text-xs text-white/60">
                                    Digite uma mensagem para visualizar
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer hint */}
            <div className="mt-auto pt-4 border-t border-white/10">
                <p className="text-xs text-white/50 text-center">
                    Esta é uma simulação. A aparência real pode variar.
                </p>
            </div>
        </div>
    )
}
