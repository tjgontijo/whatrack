'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { ChatItem } from '../types'

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
    onSearch
}: ChatListProps) {
    const [search, setSearch] = React.useState('')

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setSearch(val)
        onSearch(val)
    }

    return (
        <div className="flex flex-col h-full border-r border-border/60 bg-card/30 backdrop-blur-sm">
            <div className="p-4 border-b border-border/60 space-y-4">
                <h1 className="text-xl font-bold tracking-tight">Mensagens</h1>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar conversa..."
                        className="pl-9 bg-muted/40 border-none rounded-xl"
                        value={search}
                        onChange={handleSearchChange}
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="flex flex-col">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground animate-pulse">
                            Carregando conversas...
                        </div>
                    ) : chats.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            Nenhuma conversa encontrada.
                        </div>
                    ) : (
                        chats.map((chat) => (
                            <button
                                key={chat.id}
                                onClick={() => onSelectChat(chat)}
                                className={cn(
                                    "flex items-center gap-3 p-4 text-left transition-all hover:bg-muted/50 border-b border-border/40",
                                    selectedChatId === chat.id && "bg-muted shadow-inner border-l-4 border-l-primary"
                                )}
                            >
                                <Avatar className="h-12 w-12 border border-border/50">
                                    <AvatarImage src={chat.profilePicUrl || undefined} />
                                    <AvatarFallback className="bg-primary/10 text-primary uppercase font-bold">
                                        {chat.name.substring(0, 2)}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold truncate text-sm">
                                            {chat.name}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                            {new Date(chat.lastMessageAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate leading-relaxed">
                                        {chat.lastMessage?.body || 'Arquivo ou mídia'}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
