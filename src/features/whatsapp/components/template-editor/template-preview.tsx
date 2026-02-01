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
            // Extrai apenas o número da variável (ex: "1" de "{{1}}")
            const varNumber = match.replace(/\{\{|\}\}/g, '')
            const sample = samples[varNumber] || match
            preview = preview.replaceAll(match, sample)
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
        <div className="h-full flex flex-col bg-[#E5DDD5] relative">
            {/* Header Simulator */}
            <div className="bg-[#075E54] p-4 flex items-center gap-3 text-white shadow-md">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                    <MessageCircle className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="font-bold text-sm">Preview do Cliente</h3>
                    <p className="text-[10px] opacity-80 uppercase tracking-widest font-medium">Online</p>
                </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 p-6 flex flex-col justify-end">
                <div className="max-w-[85%] relative">
                    {/* Message bubble */}
                    <div className={cn(
                        "relative bg-white dark:bg-white rounded-xl rounded-tl-none p-3.5 shadow-sm border border-black/5 transition-all duration-300",
                        hasContent ? 'opacity-100 scale-100' : 'opacity-60 scale-95'
                    )}>
                        {/* Bubble tail */}
                        <div className="absolute -left-2 top-0 w-0 h-0 border-t-[15px] border-t-white border-r-[15px] border-r-transparent"></div>

                        {/* Message content */}
                        <p className={cn(
                            "text-[13px] leading-relaxed whitespace-pre-wrap break-words",
                            hasContent ? 'text-slate-800' : 'text-slate-400 italic'
                        )}>
                            {previewText}
                        </p>

                        {/* Timestamp */}
                        <div className="flex items-center justify-end gap-1 mt-1.5 pt-1 border-t border-slate-50">
                            <span className="text-[9px] text-slate-400 font-medium">
                                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <svg className="w-3.5 h-3.5 text-blue-400" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M12.354 4.354a.5.5 0 0 0-.708-.708L5 10.293 1.854 7.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l7-7zm-4.208 7-.896-.897.707-.707.543.543 6.646-6.647a.5.5 0 0 1 .708.708l-7 7a.5.5 0 0 1-.708 0z" />
                                <path d="m5.354 7.146.896.897-.707.707-.897-.896a.5.5 0 1 1 .708-.708z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer simulator */}
            <div className="bg-slate-100/50 p-2 border-t border-slate-200 mt-auto">
                <p className="text-[9px] text-slate-400 text-center font-medium">
                    Simulação de interface do WhatsApp
                </p>
            </div>
        </div>
    )
}
