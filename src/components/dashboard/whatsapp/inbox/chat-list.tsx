'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ChatItem } from './types'
import { InstanceSelector } from './instance-selector'

interface ChatListProps {
  chats: ChatItem[]
  selectedChatId?: string
  onSelectChat: (chat: ChatItem) => void
  selectedInstanceId?: string | null
  onInstanceChange?: (instanceId: string) => void
  isLoading?: boolean
  onSearch: (query: string) => void
}

export function ChatList({
  chats,
  selectedChatId,
  onSelectChat,
  selectedInstanceId,
  onInstanceChange,
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
    <div className="border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/60 flex h-full flex-col border-r backdrop-blur">
      <div className="border-border/40 space-y-4 border-b p-4">
        {onInstanceChange && (
          <InstanceSelector
            selectedInstanceId={selectedInstanceId || null}
            onInstanceChange={onInstanceChange}
          />
        )}
        <div className="relative">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar conversa..."
            className="bg-muted/40 h-9 rounded-xl border-none pl-9 text-sm"
            value={search}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {isLoading ? (
            <div className="text-muted-foreground animate-pulse p-8 text-center text-sm">
              Carregando conversas...
            </div>
          ) : chats.length === 0 ? (
            <div className="text-muted-foreground p-8 text-center text-sm">
              Nenhuma conversa encontrada.
            </div>
          ) : (
            chats.map((chat) => {
              const statusBadgeMap: Record<string, { bg: string; text: string; label: string }> = {
                open: { bg: 'bg-amber-500/10', text: 'text-amber-700', label: 'Aberto' },
                closed_won: { bg: 'bg-green-500/10', text: 'text-green-700', label: 'Ganho' },
                closed_lost: { bg: 'bg-red-500/10', text: 'text-red-700', label: 'Perdido' },
              }

              const statusBadge = chat.currentTicket && statusBadgeMap[chat.currentTicket.status]

              return (
                <button
                  key={chat.id}
                  onClick={() => onSelectChat(chat)}
                  className={cn(
                    'hover:bg-muted/50 border-border/40 group flex items-center gap-3 border-b p-3 text-left transition-all',
                    selectedChatId === chat.id
                      ? 'bg-muted border-l-primary border-l-4 shadow-inner'
                      : 'border-l-4 border-l-transparent'
                  )}
                >
                  <div className="relative">
                    <Avatar className="border-border/50 h-11 w-11 border">
                      <AvatarImage src={chat.profilePicUrl || undefined} />
                      <AvatarFallback className="bg-primary/5 text-primary text-xs font-medium uppercase">
                        {chat.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    {chat.unreadCount && chat.unreadCount > 0 ? (
                      <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 p-0 text-[10px] hover:bg-green-600">
                        {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center justify-between">
                      <span className="truncate text-sm font-semibold">{chat.name}</span>
                      <span className="text-muted-foreground whitespace-nowrap text-[10px]">
                        {new Date(chat.lastMessageAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="mb-1 flex h-4 flex-wrap items-center gap-1.5 overflow-hidden">
                      {chat.currentTicket?.stage && (
                        <div
                          className="font-medium/90 rounded px-1.5 py-0.5 text-[9px] tracking-wide text-white"
                          style={{ backgroundColor: chat.currentTicket.stage.color }}
                        >
                          {chat.currentTicket.stage.name}
                        </div>
                      )}
                      {chat.currentTicket?.tracking &&
                        chat.currentTicket.tracking.sourceType === 'paid' && (
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 border-0 bg-[#c13584]/10 px-1.5 py-0 text-[9px] font-medium tracking-wide text-[#c13584]"
                          >
                            🔥 Ads
                          </Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground group-hover:text-foreground/80 truncate text-xs leading-relaxed transition-colors">
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
