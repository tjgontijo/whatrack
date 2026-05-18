'use client'

import { useQuery } from '@tanstack/react-query'
import { MoreVertical, RotateCw, Search } from 'lucide-react'
import * as React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { apiFetch } from '@/lib/http/api-client'
import { MessageBubble } from './message-bubble'
import type { ChatItem, MessageListResponse } from './types'

interface ChatWindowProps {
  chat: ChatItem
  organizationId: string
  projectId?: string
}

export function ChatWindow({ chat, organizationId, projectId }: ChatWindowProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const { data, isLoading, isFetching, refetch } = useQuery<MessageListResponse>({
    queryKey: ['chat-messages', chat.id, organizationId, projectId],
    queryFn: async () => {
      const data = await apiFetch(`/api/v1/whatsapp/chats/${chat.id}/messages`, {
        orgId: organizationId,
        projectId,
      })
      return data as MessageListResponse
    },
    // Real-time updates via Centrifugo - no polling needed
    staleTime: Infinity, // Don't mark as stale automatically
  })

  // Scroll to bottom when messages load or change
  React.useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [])

  return (
    <div className='relative flex h-full flex-col bg-muted/10'>
      {/* Header */}
      <header className='sticky top-0 z-10 flex items-center justify-between border-border/60 border-b bg-card/50 p-4 backdrop-blur-md'>
        <div className='flex items-center gap-3'>
          <Avatar className='h-10 w-10 border border-border/40'>
            <AvatarImage src={chat.profilePicUrl || undefined} />
            <AvatarFallback className='bg-primary/10 font-bold text-primary text-xs uppercase'>
              {chat.name.substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0'>
            <h2 className='truncate font-bold text-sm'>{chat.name}</h2>
            <p className='flex items-center gap-1 text-[10px] text-muted-foreground'>
              {chat.phone}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='h-9 w-9 text-muted-foreground'
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RotateCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
          <Button variant='ghost' size='icon' className='h-9 w-9 text-muted-foreground'>
            <Search className='h-4 w-4' />
          </Button>
          <Button variant='ghost' size='icon' className='h-9 w-9 text-muted-foreground'>
            <MoreVertical className='h-4 w-4' />
          </Button>
        </div>
      </header>

      {/* Messages Area */}
      <div className='flex-1 overflow-hidden' ref={scrollRef}>
        <ScrollArea className='h-full px-6 py-8'>
          <div className='mx-auto flex max-w-4xl flex-col'>
            {isLoading ? (
              <div className='flex items-center justify-center p-12 text-muted-foreground'>
                <div className='h-8 w-8 animate-spin rounded-full border-primary border-b-2' />
              </div>
            ) : data?.items?.length === 0 ? (
              <div className='mb-8 rounded-2xl border border-border border-dashed bg-card/30 p-12 text-center text-muted-foreground'>
                <p className='text-sm'>Nenhuma mensagem histórica encontrada para este lead.</p>
                <p className='mt-1 text-xs'>
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
      <footer className='border-border/60 border-t bg-card/50 p-4 backdrop-blur-md'>
        <div className='mx-auto max-w-4xl rounded-xl border border-border/60 bg-muted/30 p-4 text-center text-muted-foreground text-xs italic'>
          Modo Somente Visualização: Responda diretamente pelo aplicativo do WhatsApp do seu
          celular. Todas as mensagens serão registradas aqui automaticamente.
        </div>
      </footer>
    </div>
  )
}
