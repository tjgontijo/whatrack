'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface Message {
  id: string
  timestamp: string
  from: string
  body: string
  type: string
}

interface MessageHistoryProps {
  messages: Message[]
}

export function MessageHistory({ messages }: MessageHistoryProps) {
  if (messages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Mensagens</CardTitle>
          <CardDescription>
            Mensagens recebidas via webhook
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhuma mensagem recebida ainda. Quando mensagens chegarem via webhook, elas aparecerão aqui.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Mensagens</CardTitle>
        <CardDescription>
          {messages.length} mensagem(ns) recebida(s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="border rounded-lg p-4 space-y-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm">De: {msg.from}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(parseInt(msg.timestamp) * 1000).toLocaleString('pt-BR')}
                  </p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {msg.type}
                </span>
              </div>
              <p className="text-sm">{msg.body}</p>
              <p className="text-xs text-muted-foreground font-mono">ID: {msg.id}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
