'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { MessageSquareOff } from 'lucide-react'

import { authClient } from '@/lib/auth/auth-client'
import { ORGANIZATION_HEADER } from '@/lib/constants'
import { useRealtime } from '@/features/whatsapp/inbox/hooks/use-realtime'
import { ChatList } from '@/features/whatsapp/inbox/components/chat-list'
import { ChatWindow } from '@/features/whatsapp/inbox/components/chat-window'
import { TicketPanel } from '@/features/whatsapp/inbox/components/ticket-panel'
import { ChatItem, ChatListResponse } from '@/features/whatsapp/inbox/types'
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from '@/components/ui/resizable'

export default function WhatsAppInboxPage() {
    const { data: activeOrg } = authClient.useActiveOrganization()
    const organizationId = activeOrg?.id

    const [selectedChat, setSelectedChat] = React.useState<ChatItem | null>(null)
    const [searchQuery, setSearchQuery] = React.useState('')
    const [selectedInstanceId, setSelectedInstanceId] = React.useState<string | null>(null)

    // Enable real-time updates via Centrifugo
    useRealtime(organizationId)

    const { data, isLoading } = useQuery<ChatListResponse>({
        queryKey: ['whatsapp-chats', organizationId, searchQuery, selectedInstanceId],
        enabled: !!organizationId,
        queryFn: async () => {
            const url = new URL('/api/v1/whatsapp/chats', window.location.origin)
            if (searchQuery) url.searchParams.set('q', searchQuery)
            if (selectedInstanceId && selectedInstanceId !== 'all') {
                url.searchParams.set('instanceId', selectedInstanceId)
            }

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
            <ResizablePanelGroup direction="horizontal">
                {/* Left Panel: Conversations */}
                <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
                    <ChatList
                        chats={data?.items || []}
                        selectedChatId={selectedChat?.id}
                        onSelectChat={setSelectedChat}
                        selectedInstanceId={selectedInstanceId}
                        onInstanceChange={setSelectedInstanceId}
                        isLoading={isLoading}
                        onSearch={setSearchQuery}
                    />
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Middle Panel: Messages */}
                <ResizablePanel defaultSize={50} minSize={30}>
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
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right Panel: Ticket Details */}
                <ResizablePanel defaultSize={25} minSize={20} maxSize={40} collapsible>
                    {selectedChat ? (
                        <TicketPanel
                            conversationId={selectedChat.id}
                            organizationId={organizationId}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-4 text-center text-sm text-muted-foreground">
                            Selecione uma conversa para ver os detalhes do ticket
                        </div>
                    )}
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}
