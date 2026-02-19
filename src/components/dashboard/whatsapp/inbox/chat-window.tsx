'use client'

import * as React from 'react'
import { MoreVertical, Search, RotateCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatItem, MessageListResponse } from './types'
import { MessageBubble } from './message-bubble'
import { ORGANIZATION_HEADER } from '@/lib/constants'

interface ChatWindowProps {
    chat: ChatItem
    organizationId: string
}

export function ChatWindow({ chat, organizationId }: ChatWindowProps) {
    const scrollRef = React.useRef<HTMLDivElement>(null)

    const { data, isLoading, isFetching, refetch } = useQuery<MessageListResponse>({
        queryKey: ['chat-messages', chat.id, organizationId],
        queryFn: async () => {
            console.log('[ChatWindow] Fetching messages for chat:', chat.id, 'org:', organizationId)
            const response = await fetch(`/api/v1/whatsapp/chats/${chat.id}/messages`, {
                headers: {
                    [ORGANIZATION_HEADER]: organizationId
                }
            })
            if (!response.ok) throw new Error('Falha ao carregar mensagens')
            return response.json()
        },
        // Real-time updates via Centrifugo - no polling needed
        staleTime: Infinity, // Don't mark as stale automatically
    })

    // Log when data changes (for debugging real-time updates)
    React.useEffect(() => {
        console.log('[ChatWindow] Messages data updated for chat', chat.id, ':', data?.items?.length, 'messages')
    }, [data, chat.id])

    // Scroll to bottom when messages load or change
    React.useEffect(() => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight
            }
        }
    }, [data?.items])

    return (
        <div className="flex flex-col h-full bg-muted/10 relative">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-border/60 bg-card/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border/40">
                        <AvatarImage src={chat.profilePicUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary uppercase font-bold text-xs">
                            {chat.name.substring(0, 2)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <h2 className="font-bold text-sm truncate">{chat.name}</h2>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            {chat.phone}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RotateCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                        <Search className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-hidden" ref={scrollRef}>
                <ScrollArea className="h-full px-6 py-8">
                    <div className="flex flex-col max-w-4xl mx-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-12 text-muted-foreground">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                            </div>
                        ) : data?.items?.length === 0 ? (
                            <div className="text-center p-12 text-muted-foreground bg-card/30 rounded-2xl border border-dashed border-border mb-8">
                                <p className="text-sm">Nenhuma mensagem histórica encontrada para este lead.</p>
                                <p className="text-xs mt-1">As mensagens enviadas no app móvel aparecerão aqui em tempo real.</p>
                            </div>
                        ) : (
                            data?.items.map((msg) => (
                                <MessageBubble key={msg.id} message={msg} />
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Sync Bar / Placeholder for Input */}
            <footer className="p-4 border-t border-border/60 bg-card/50 backdrop-blur-md">
                <div className="max-w-4xl mx-auto p-4 rounded-xl border border-border/60 bg-muted/30 text-center text-xs text-muted-foreground italic">
                    Modo Somente Visualização: Responda diretamente pelo aplicativo do WhatsApp do seu celular. Todas as mensagens serão registradas aqui automaticamente.
                </div>
            </footer>
        </div>
    )
}
