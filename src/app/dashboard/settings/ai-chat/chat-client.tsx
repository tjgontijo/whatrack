'use client'

import { useEffect, useState } from 'react'
import { DefaultChatTransport, ToolUIPart } from 'ai'
import { useChat } from '@ai-sdk/react'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input'
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from '@/components/ai-elements/tool'

export function AiChatClient() {
  const [input, setInput] = useState('')

  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/v1/chat',
    }),
  })

  useEffect(() => {
    const fetchMessages = async () => {
      const res = await fetch('/api/v1/chat')
      const data = (await res.json()) as Array<(typeof messages)[number]>
      setMessages(data)
    }

    fetchMessages()
  }, [setMessages])

  const handleSubmit = async () => {
    const text = input.trim()
    if (!text) return

    sendMessage({ text })
    setInput('')
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Mastra Chat</h1>
        <p className="text-muted-foreground text-sm">
          Interface de teste do agente Mastra com ferramentas e memória.
        </p>
      </div>

      <div className="relative h-[70vh] rounded-lg border">
        <div className="flex h-full flex-col">
          <Conversation className="h-full">
            <ConversationContent>
              {messages.map((message) => (
                <div key={message.id}>
                  {message.parts?.map((part, i) => {
                    if (part.type === 'text') {
                      return (
                        <Message key={`${message.id}-${i}`} from={message.role}>
                          <MessageContent>
                            <MessageResponse>{part.text}</MessageResponse>
                          </MessageContent>
                        </Message>
                      )
                    }

                    if (part.type?.startsWith('tool-')) {
                      const toolPart = part as ToolUIPart

                      return (
                        <Tool key={`${message.id}-${i}`}>
                          <ToolHeader
                            type={toolPart.type}
                            state={toolPart.state || 'output-available'}
                            className="cursor-pointer"
                          />
                          <ToolContent>
                            <ToolInput input={toolPart.input || {}} />
                            <ToolOutput
                              output={toolPart.output}
                              errorText={toolPart.errorText}
                            />
                          </ToolContent>
                        </Tool>
                      )
                    }

                    return null
                  })}
                </div>
              ))}
              <ConversationScrollButton />
            </ConversationContent>
          </Conversation>

          <PromptInput onSubmit={handleSubmit} className="border-t p-3">
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(e) => setInput(e.target.value)}
                className="md:leading-10"
                value={input}
                placeholder="Digite sua mensagem..."
                disabled={status !== 'ready'}
              />
            </PromptInputBody>
          </PromptInput>
        </div>
      </div>
    </div>
  )
}
