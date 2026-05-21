'use client'

import { Search } from 'lucide-react'
import * as React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils/utils'
import type { ChatItem } from './types'

interface ChatListProps {
  chats: ChatItem[]
  selectedChatId?: string
  onSelectChat: (chat: ChatItem) => void
  isLoading?: boolean
  onSearch: (query: string) => void
}

export function ChatList({
  chats,
  selectedChatId,
  onSelectChat,
  isLoading,
  onSearch,
}: ChatListProps) {
  const [search, setSearch] = React.useState('')

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearch(val)
    onSearch(val)
  }

  return (
    <div className='flex h-full flex-col border-border/40 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='border-border/40 border-b px-3 py-2.5'>
        <div className='relative'>
          <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/70' />
          <Input
            placeholder='Buscar conversa...'
            className='h-12 border-border/40 bg-muted/15 pl-10 text-sm placeholder:text-muted-foreground/70'
            value={search}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <ScrollArea className='flex-1'>
        <div className='flex flex-col'>
          {isLoading ? (
            <div className='animate-pulse p-8 text-center text-muted-foreground text-sm'>
              Carregando conversas...
            </div>
          ) : chats.length === 0 ? (
            <div className='p-8 text-center text-muted-foreground text-sm'>
              Nenhuma conversa encontrada.
            </div>
          ) : (
            chats.map((chat) => {
              const statusBadgeMap: Record<string, { bg: string; text: string; label: string }> = {
                open: { bg: 'bg-amber-500/10', text: 'text-amber-700', label: 'Aberto' },
                closed_won: { bg: 'bg-green-500/10', text: 'text-green-700', label: 'Ganho' },
                closed_lost: { bg: 'bg-red-500/10', text: 'text-red-700', label: 'Perdido' },
              }

              const _statusBadge = chat.currentDeal && statusBadgeMap[chat.currentDeal.status]

              return (
                <button
                  type='button'
                  key={chat.id}
                  onClick={() => onSelectChat(chat)}
                  className={cn(
                    'group flex items-center gap-3 border-border/40 border-b p-3 text-left transition-all hover:bg-muted/50',
                    selectedChatId === chat.id
                      ? 'border-l-4 border-l-primary bg-muted shadow-inner'
                      : 'border-l-4 border-l-transparent'
                  )}
                >
                  <div className='relative'>
                    <Avatar className='h-11 w-11 border border-border/50'>
                      <AvatarImage src={chat.profilePicUrl || undefined} />
                      <AvatarFallback className='bg-primary/5 font-medium text-primary text-xs uppercase'>
                        {chat.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    {chat.unreadCount && chat.unreadCount > 0 ? (
                      <Badge className='absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 p-0 text-[10px] hover:bg-green-600'>
                        {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                      </Badge>
                    ) : null}
                  </div>

                  <div className='min-w-0 flex-1'>
                    <div className='mb-0.5 flex items-center justify-between'>
                      <span className='truncate font-semibold text-sm'>{chat.name}</span>
                      <div className='ml-2 flex flex-col items-end gap-1'>
                        <span className='whitespace-nowrap text-[10px] text-muted-foreground'>
                          {new Date(chat.lastMessageAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <div className='flex items-center gap-1'>
                          {_statusBadge ? (
                            <Badge
                              className={cn(
                                'h-4 rounded-sm border-0 px-1.5 font-medium text-[9px] leading-none',
                                _statusBadge.bg,
                                _statusBadge.text
                              )}
                            >
                              {_statusBadge.label}
                            </Badge>
                          ) : null}
                          {chat.currentDeal?.tracking &&
                            chat.currentDeal.tracking.sourceType === 'paid' && (
                              <Badge
                                variant='outline'
                                className='h-4 rounded-sm border-border/40 bg-transparent px-1.5 font-medium text-[9px] text-muted-foreground leading-none'
                              >
                                Ads
                              </Badge>
                            )}
                        </div>
                      </div>
                    </div>
                    <div className='mb-1 flex h-4 flex-wrap items-center gap-1.5 overflow-hidden'>
                      {chat.currentDeal?.stage && (
                        <div
                          className='rounded-sm px-1.5 py-0.5 font-medium/90 text-[9px] text-white tracking-wide'
                          style={{ backgroundColor: chat.currentDeal.stage.color }}
                        >
                          {chat.currentDeal.stage.name}
                        </div>
                      )}
                    </div>
                    <p className='truncate text-muted-foreground text-xs leading-relaxed transition-colors group-hover:text-foreground/80'>
                      {chat.lastMessage?.body || 'Arquivo ou mídia'}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
