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

export interface DealStage {
  id: string
  name: string
  color: string
}

export interface DealTracking {
  sourceType: string
  utmSource?: string | null
  ctwaclid?: string | null
}

export interface DealInfo {
  id: string
  status: 'open' | 'closed_won' | 'closed_lost'
  stage: DealStage
  tracking?: DealTracking | null
}

export interface ChatItem {
  id: string
  name: string
  phone: string | null
  profilePicUrl: string | null
  lastMessageAt: string | Date
  lastMessage: Message | null
  unreadCount?: number
  currentDeal?: DealInfo
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
