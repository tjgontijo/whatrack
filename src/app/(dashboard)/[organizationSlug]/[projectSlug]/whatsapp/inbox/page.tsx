'use client'

import { useQuery } from '@tanstack/react-query'
import { MessageSquareOff, RefreshCw } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useRequiredProjectRouteContext } from '@/features/projects/hooks/use-project-route-context'
import { ChatList } from '@/features/whatsapp/components/inbox/chat-list'
import { ChatWindow } from '@/features/whatsapp/components/inbox/chat-window'
import { DealPanel } from '@/features/whatsapp/components/inbox/deal-panel'
import { InstanceSelector } from '@/features/whatsapp/components/inbox/instance-selector'
import type { ChatItem, ChatListResponse } from '@/features/whatsapp/components/inbox/types'
import { useRealtime } from '@/features/whatsapp/hooks/use-realtime'
import { apiFetch } from '@/lib/http/api-client'
import { cn } from '@/lib/utils/utils'

export default function WhatsAppInboxPage() {
  const { organizationId, projectId } = useRequiredProjectRouteContext()

  const [selectedChat, setSelectedChat] = React.useState<ChatItem | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedInstanceId, setSelectedInstanceId] = React.useState<string | null>(null)

  // Enable real-time updates via Centrifugo
  useRealtime(organizationId)

  const { data, isLoading, refetch, isRefetching } = useQuery<ChatListResponse>({
    queryKey: ['whatsapp-chats', organizationId, projectId, searchQuery, selectedInstanceId],
    enabled: !!organizationId,
    queryFn: async () => {
      const url = new URL('/api/v1/whatsapp/chats', window.location.origin)
      if (searchQuery) url.searchParams.set('q', searchQuery)
      if (selectedInstanceId && selectedInstanceId !== 'all') {
        url.searchParams.set('instanceId', selectedInstanceId)
      }

      const data = await apiFetch(url.toString(), {
        orgId: organizationId,
        projectId,
      })
      return data as ChatListResponse
    },
  })
  return (
    <div
      className='-mx-4 -my-2 flex flex-col overflow-hidden bg-background'
      style={{ height: 'calc(100vh - 65px)' }}
    >
      <div className='flex h-12 shrink-0 items-center justify-between border-border border-b px-4'>
        <div className='flex min-w-0 items-center gap-3'>
          <h1 className='font-semibold text-sm'>Inbox</h1>
          <InstanceSelector
            selectedInstanceId={selectedInstanceId}
            onInstanceChange={setSelectedInstanceId}
            className='w-[270px]'
          />
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-7 text-muted-foreground hover:text-foreground'
          onClick={() => void refetch()}
          disabled={isRefetching || isLoading}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', (isRefetching || isLoading) && 'animate-spin')} />
        </Button>
      </div>
      <div className='flex flex-1 overflow-hidden border-border/40 border-t'>
        <ResizablePanelGroup direction='horizontal'>
          {/* Left Panel: Conversations */}
          <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
            <ChatList
              chats={data?.items || []}
              selectedChatId={selectedChat?.id}
              onSelectChat={setSelectedChat}
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
                projectId={projectId}
              />
            ) : (
              <div className='flex h-full flex-col items-center justify-center bg-muted/5 p-8 text-center'>
                <div className='mb-4 rounded-3xl border border-primary/10 bg-primary/5 p-6'>
                  <MessageSquareOff className='h-12 w-12 text-primary/40' />
                </div>
                <h3 className='mb-2 font-bold text-lg'>Nenhuma conversa selecionada</h3>
                <p className='max-w-xs text-muted-foreground text-sm'>
                  Selecione um contato na lista à esquerda para visualizar o histórico de mensagens
                  e monitorar a conversa.
                </p>
              </div>
            )}
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel: Deal Details */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40} collapsible>
            {selectedChat ? (
              <DealPanel
                conversationId={selectedChat.id}
                organizationId={organizationId}
                projectId={projectId}
                chat={selectedChat}
              />
            ) : (
              <div className='flex h-full flex-col items-center justify-center p-4 text-center text-muted-foreground text-sm'>
                Selecione uma conversa para ver os detalhes do deal
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
