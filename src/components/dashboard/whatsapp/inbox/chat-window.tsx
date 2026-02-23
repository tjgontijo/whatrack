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
          [ORGANIZATION_HEADER]: organizationId,
        },
      })
      if (!response.ok) throw new Error('Falha ao carregar mensagens')
      return response.json()
    },
    // Real-time updates via Centrifugo - no polling needed
    staleTime: Infinity, // Don't mark as stale automatically
  })

  // Log when data changes (for debugging real-time updates)
  React.useEffect(() => {
    console.log(
      '[ChatWindow] Messages data updated for chat',
      chat.id,
      ':',
      data?.items?.length,
      'messages'
    )
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
    <div className="bg-muted/10 relative flex h-full flex-col">
      {/* Header */}
      <header className="border-border/60 bg-card/50 sticky top-0 z-10 flex items-center justify-between border-b p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Avatar className="border-border/40 h-10 w-10 border">
            <AvatarImage src={chat.profilePicUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold uppercase">
              {chat.name.substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold">{chat.name}</h2>
            <p className="text-muted-foreground flex items-center gap-1 text-[10px]">
              {chat.phone}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground h-9 w-9"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RotateCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden" ref={scrollRef}>
        <ScrollArea className="h-full px-6 py-8">
          <div className="mx-auto flex max-w-4xl flex-col">
            {isLoading ? (
              <div className="text-muted-foreground flex items-center justify-center p-12">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
              </div>
            ) : data?.items?.length === 0 ? (
              <div className="text-muted-foreground bg-card/30 border-border mb-8 rounded-2xl border border-dashed p-12 text-center">
                <p className="text-sm">Nenhuma mensagem histórica encontrada para este lead.</p>
                <p className="mt-1 text-xs">
                  As mensagens enviadas no app móvel aparecerão aqui em tempo real.
                </p>
              </div>
            ) : (
              data?.items.map((msg) => <MessageBubble key={msg.id} message={msg} />)
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Sync Bar / Placeholder for Input */}
      <footer className="border-border/60 bg-card/50 border-t p-4 backdrop-blur-md">
        <div className="border-border/60 bg-muted/30 text-muted-foreground mx-auto max-w-4xl rounded-xl border p-4 text-center text-xs italic">
          Modo Somente Visualização: Responda diretamente pelo aplicativo do WhatsApp do seu
          celular. Todas as mensagens serão registradas aqui automaticamente.
        </div>
      </footer>
    </div>
  )
}
