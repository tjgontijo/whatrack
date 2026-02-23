'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { MessageSquareOff } from 'lucide-react'

import { authClient } from '@/lib/auth/auth-client'
import { ORGANIZATION_HEADER } from '@/lib/constants'
import { useRealtime } from '@/hooks/whatsapp/use-realtime'
import { ChatList } from '@/components/dashboard/whatsapp/inbox/chat-list'
import { ChatWindow } from '@/components/dashboard/whatsapp/inbox/chat-window'
import { TicketPanel } from '@/components/dashboard/whatsapp/inbox/ticket-panel'
import { ChatItem, ChatListResponse } from '@/components/dashboard/whatsapp/inbox/types'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'

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
          [ORGANIZATION_HEADER]: organizationId!,
        },
      })
      if (!response.ok) throw new Error('Falha ao carregar conversas')
      return response.json()
    },
  })

  if (!organizationId) {
    return (
      <div className="flex h-[calc(100vh-140px)] items-center justify-center">
        <p className="text-muted-foreground">Carregando organização...</p>
      </div>
    )
  }

  return (
    <div className="bg-background border-border/40 -mx-4 -my-2 flex h-[calc(100vh-65px)] overflow-hidden border-t">
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
            <ChatWindow chat={selectedChat} organizationId={organizationId} />
          ) : (
            <div className="bg-muted/5 flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="bg-primary/5 border-primary/10 mb-4 rounded-3xl border p-6">
                <MessageSquareOff className="text-primary/40 h-12 w-12" />
              </div>
              <h3 className="mb-2 text-lg font-bold">Nenhuma conversa selecionada</h3>
              <p className="text-muted-foreground max-w-xs text-sm">
                Selecione um contato na lista à esquerda para visualizar o histórico de mensagens e
                monitorar a conversa.
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
              chat={selectedChat}
            />
          ) : (
            <div className="text-muted-foreground flex h-full flex-col items-center justify-center p-4 text-center text-sm">
              Selecione uma conversa para ver os detalhes do ticket
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
