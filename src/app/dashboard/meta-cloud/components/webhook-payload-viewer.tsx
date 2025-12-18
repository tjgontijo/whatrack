'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface WebhookPayloadViewerProps {
  payload: Record<string, unknown> | null
}

export function WebhookPayloadViewer({ payload }: WebhookPayloadViewerProps) {
  if (!payload) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Último Payload Recebido</CardTitle>
          <CardDescription>
            Nenhum webhook recebido ainda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Quando o Meta Cloud enviar um webhook, o payload será exibido aqui
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Último Payload Recebido</CardTitle>
        <CardDescription>
          Dados do último webhook recebido do Meta Cloud
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-slate-900 text-slate-50 rounded-lg p-4 overflow-x-auto">
          <pre className="text-xs font-mono whitespace-pre-wrap break-words">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
