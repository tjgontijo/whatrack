export interface Message {
    id: string
    wamid: string
    leadId: string
    instanceId: string
    direction: 'INBOUND' | 'OUTBOUND'
    type: string
    body: string | null
    mediaUrl: string | null
    status: string
    timestamp: string | Date
    createdAt: string | Date
}

export interface TicketStage {
    id: string
    name: string
    color: string
}

export interface TicketInfo {
    id: string
    status: 'open' | 'closed_won' | 'closed_lost'
    stage: TicketStage
}

export interface ChatItem {
    id: string
    name: string
    phone: string | null
    profilePicUrl: string | null
    lastMessageAt: string | Date
    lastMessage: Message | null
    unreadCount?: number
    currentTicket?: TicketInfo
}

export interface ChatListResponse {
    items: ChatItem[]
}

export interface MessageListResponse {
    items: Message[]
    total: number
    page: number
    pageSize: number
}
