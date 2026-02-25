import { handleChatStream } from '@mastra/ai-sdk'
import { MessageList } from '@mastra/core/agent/message-list'
import { createUIMessageStreamResponse } from 'ai'
import { NextResponse } from 'next/server'
import { mastra } from '@/mastra'

const AGENT_ID = 'weather-agent'
const THREAD_ID = 'example-user-id'
const RESOURCE_ID = 'weather-chat'

type ChatParams = {
  messages?: unknown[]
  memory?: Record<string, unknown>
  [key: string]: unknown
}

export async function POST(req: Request) {
  const params = (await req.json()) as ChatParams
  const stream = await handleChatStream({
    mastra,
    agentId: AGENT_ID,
    params: {
      ...params,
      memory: {
        ...params.memory,
        thread: THREAD_ID,
        resource: RESOURCE_ID,
      },
    } as any,
  })

  return createUIMessageStreamResponse({ stream })
}

export async function GET() {
  const memory = await mastra.getAgentById(AGENT_ID).getMemory()

  try {
    const response = await memory?.recall({
      threadId: THREAD_ID,
      resourceId: RESOURCE_ID,
    })

    const uiMessages = new MessageList().add(response?.messages || [], 'memory').get.all.aiV5.ui()
    return NextResponse.json(uiMessages)
  } catch {
    return NextResponse.json([])
  }
}
