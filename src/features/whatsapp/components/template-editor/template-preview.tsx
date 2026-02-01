'use client'

import React from 'react'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    compact = false
}: TemplatePreviewProps) {
    const getPreviewText = () => {
        if (!bodyText || bodyText.trim() === '') {
            return 'Sua mensagem aparecerá aqui...'
        }

        let preview = bodyText
        const matches = bodyText.match(/\{\{(\d+)\}\}/g) || []

        matches.forEach(match => {
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
            <div className="relative bg-[#0b141a] rounded-lg p-3 border border-[#303d45]">
                {headerText && (
                    <p className="text-[12px] font-bold text-[#e9edef] mb-1">{headerText}</p>
                )}
                <p className="text-[13px] leading-relaxed text-[#e9edef] whitespace-pre-wrap">
                    {previewText}
                </p>
                {footerText && (
                    <p className="text-[11px] text-[#8696a0] mt-1">{footerText}</p>
                )}
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-gradient-to-b from-[#075E54] to-[#128C7E] p-6 text-white overflow-hidden">
            {/* Header Simulator */}
            <div className="flex items-center gap-3 mb-6">
                <MessageCircle className="h-5 w-5" />
                <div>
                    <h3 className="font-semibold text-sm">Preview da Mensagem</h3>
                    <p className="text-xs opacity-75">Como seu cliente verá no WhatsApp</p>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col justify-center overflow-y-auto pt-4 pb-8">
                <div className="relative w-full">
                    <div className="text-xs text-white/60 mb-1.5 px-1 uppercase tracking-wider font-medium">Sua Empresa</div>

                    <div className={cn(
                        "relative bg-[#202c33] rounded-lg rounded-tl-none p-4 shadow-xl border border-white/5 transition-all duration-300",
                        hasContent ? 'opacity-100 scale-100' : 'opacity-40 scale-95'
                    )}>
                        {/* Bubble tail */}
                        <div className="absolute -left-2 top-0 w-0 h-0 border-t-[12px] border-t-[#202c33] border-r-[12px] border-r-transparent"></div>

                        {/* Template Identifier (Optional in reality but good for user) */}
                        {templateName && !headerText && (
                            <h4 className="text-[11px] font-bold text-[#00a884] mb-1.5 uppercase tracking-wider opacity-90">{templateName}</h4>
                        )}

                        {/* Official Header */}
                        {headerText && (
                            <h4 className="text-[14px] font-bold text-[#e9edef] mb-1.5 leading-tight">{headerText}</h4>
                        )}

                        {/* Body */}
                        <p className={cn(
                            "text-[14px] leading-relaxed whitespace-pre-wrap break-words",
                            hasContent ? "text-[#e9edef]" : "text-gray-500 italic"
                        )}>
                            {previewText}
                        </p>

                        {/* Official Footer */}
                        {footerText && (
                            <p className="text-[12px] text-[#8696a0] mt-1.5 leading-snug">{footerText}</p>
                        )}

                        <div className="mt-2 flex items-center justify-end">
                            <span className="text-[10px] text-[#8696a0] font-medium">
                                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer hint */}
            <div className="mt-auto pt-4 border-t border-white/10 shrink-0">
                <p className="text-xs text-white/50 text-center font-medium">
                    Simulação de interface WhatsApp
                </p>
            </div>
        </div>
    )
}
