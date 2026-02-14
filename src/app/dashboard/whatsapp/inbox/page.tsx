'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { MessageSquareOff } from 'lucide-react'

import { authClient } from '@/lib/auth/auth-client'
import { ORGANIZATION_HEADER } from '@/lib/constants'
import { ChatList } from '@/features/whatsapp/inbox/components/chat-list'
import { ChatWindow } from '@/features/whatsapp/inbox/components/chat-window'
import { ChatItem, ChatListResponse } from '@/features/whatsapp/inbox/types'

export default function WhatsAppInboxPage() {
    const { data: activeOrg } = authClient.useActiveOrganization()
    const organizationId = activeOrg?.id

    const [selectedChat, setSelectedChat] = React.useState<ChatItem | null>(null)
    const [searchQuery, setSearchQuery] = React.useState('')

    const { data, isLoading } = useQuery<ChatListResponse>({
        queryKey: ['whatsapp-chats', organizationId, searchQuery],
        enabled: !!organizationId,
        queryFn: async () => {
            const url = new URL('/api/v1/whatsapp/chats', window.location.origin)
            if (searchQuery) url.searchParams.set('q', searchQuery)

            const response = await fetch(url.toString(), {
                headers: {
                    [ORGANIZATION_HEADER]: organizationId!
                }
            })
            if (!response.ok) throw new Error('Falha ao carregar conversas')
            return response.json()
        }
    })

    if (!organizationId) {
        return (
            <div className="flex h-[calc(100vh-140px)] items-center justify-center">
                <p className="text-muted-foreground">Carregando organização...</p>
            </div>
        )
    }

    return (
        <div className="flex bg-card rounded-2xl border border-border/60 shadow-xl overflow-hidden h-[calc(100vh-140px)]">
            {/* Sidebar */}
            <div className="w-80 flex-shrink-0">
                <ChatList
                    chats={data?.items || []}
                    selectedChatId={selectedChat?.id}
                    onSelectChat={setSelectedChat}
                    isLoading={isLoading}
                    onSearch={setSearchQuery}
                />
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
                {selectedChat ? (
                    <ChatWindow
                        chat={selectedChat}
                        organizationId={organizationId}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-muted/5">
                        <div className="p-6 rounded-3xl bg-primary/5 mb-4 border border-primary/10">
                            <MessageSquareOff className="h-12 w-12 text-primary/40" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Nenhuma conversa selecionada</h3>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            Selecione um contato na lista à esquerda para visualizar o histórico de mensagens e monitorar a conversa.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
