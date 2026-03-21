'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { MessageSquareOff, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/utils'

import { apiFetch } from '@/lib/api-client'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { useRealtime } from '@/hooks/whatsapp/use-realtime'

import { ChatList } from '@/components/dashboard/whatsapp/inbox/chat-list'
import { ChatWindow } from '@/components/dashboard/whatsapp/inbox/chat-window'
import { TicketPanel } from '@/components/dashboard/whatsapp/inbox/ticket-panel'
import { ChatItem, ChatListResponse } from '@/components/dashboard/whatsapp/inbox/types'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'

export default function WhatsAppInboxPage() {
  const { organizationId } = useRequiredProjectRouteContext()

  const [selectedChat, setSelectedChat] = React.useState<ChatItem | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedInstanceId, setSelectedInstanceId] = React.useState<string | null>(null)

  // Enable real-time updates via Centrifugo
  useRealtime(organizationId)

  const { data, isLoading, refetch, isRefetching } = useQuery<ChatListResponse>({
    queryKey: ['whatsapp-chats', organizationId, searchQuery, selectedInstanceId],
    enabled: !!organizationId,
    queryFn: async () => {
      const url = new URL('/api/v1/whatsapp/chats', window.location.origin)
      if (searchQuery) url.searchParams.set('q', searchQuery)
      if (selectedInstanceId && selectedInstanceId !== 'all') {
        url.searchParams.set('instanceId', selectedInstanceId)
      }

      const data = await apiFetch(url.toString(), {
        orgId: organizationId,
      })
      return data as ChatListResponse
    },
  })
  return (
    <div className="bg-background -mx-4 -my-2 flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 65px)' }}>
      <div className="border-border flex h-12 shrink-0 items-center justify-between border-b px-4">
        <h1 className="text-sm font-semibold">Inbox</h1>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground h-7 w-7"
          onClick={() => void refetch()}
          disabled={isRefetching || isLoading}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', (isRefetching || isLoading) && 'animate-spin')} />
        </Button>
      </div>
      <div className="border-border/40 flex flex-1 overflow-hidden border-t">
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
    </div>
  )
}
