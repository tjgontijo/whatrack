'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Template {
  id: string
  name: string
  status: string
  category: string
  language: string
}

interface SendMessageFormProps {
  onSuccess?: () => void
}

export function SendMessageForm({ onSuccess }: SendMessageFormProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [languageCode, setLanguageCode] = useState('en_US')
  const [loading, setLoading] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [templates, setTemplates] = useState<Template[]>([])
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/v1/whatsapp/meta-cloud/templates')
        const data = await response.json()

        if (data.success && data.templates) {
          setTemplates(data.templates)
          if (data.templates.length > 0) {
            setTemplateName(data.templates[0].name)
          }
        }
      } catch (error) {
        console.error('Error fetching templates:', error)
      } finally {
        setLoadingTemplates(false)
      }
    }

    fetchTemplates()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus({ type: null, message: '' })

    try {
      const response = await fetch('/api/v1/whatsapp/meta-cloud/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          templateName,
          languageCode,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus({
          type: 'success',
          message: `Template enviado com sucesso! ID: ${data.messageId}`,
        })
        setPhoneNumber('')
        onSuccess?.()
      } else {
        setStatus({
          type: 'error',
          message: data.error || 'Erro ao enviar template',
        })
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="phone">Número do WhatsApp</Label>
        <Input
          id="phone"
          placeholder="+55 61 98248-2100"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div>
        <Label htmlFor="template">Template</Label>
        {loadingTemplates ? (
          <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando templates...
          </div>
        ) : templates.length === 0 ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhum template aprovado encontrado. Crie um template no WhatsApp Business Manager.
            </AlertDescription>
          </Alert>
        ) : (
          <Select value={templateName} onValueChange={setTemplateName} disabled={loading}>
            <SelectTrigger id="template">
              <SelectValue placeholder="Selecione um template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.name}>
                  {template.name} ({template.language})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {status.type && (
        <Alert variant={status.type === 'success' ? 'default' : 'destructive'}>
          {status.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={loading || templates.length === 0} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          'Enviar Template'
        )}
      </Button>
    </form>
  )
}
