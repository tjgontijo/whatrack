'use client'

import { useState } from 'react'
import { Send, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ORGANIZATION_HEADER } from '@/lib/constants'
import { authClient } from '@/lib/auth/auth-client'

const LANGUAGE_OPTIONS = [
  { value: 'pt_BR', label: 'Português (Brasil)' },
  { value: 'en_US', label: 'English (US)' },
  { value: 'es', label: 'Español' },
]

export function TestTemplateSection() {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const [templateName, setTemplateName] = useState('')
  const [languageCode, setLanguageCode] = useState('pt_BR')
  const [phone, setPhone] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSendTemplate = async () => {
    if (!activeOrg?.id) {
      toast.error('Organização não encontrada')
      return
    }

    if (!templateName.trim()) {
      toast.error('Informe o nome do template')
      return
    }

    if (!phone.trim()) {
      toast.error('Informe o número de destino')
      return
    }

    setIsSending(true)
    try {
      const response = await fetch('/api/v1/whatsapp/meta-cloud/send-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ORGANIZATION_HEADER]: activeOrg.id,
        },
        body: JSON.stringify({
          templateName,
          languageCode,
          phone,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Falha ao enviar template')
      }

      toast.success('Template de teste enviado!')
      setPhone('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar template de teste')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Enviar Template de Teste</CardTitle>
        <CardDescription>
          Teste o envio de templates de mensagem aprovados pela Meta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="template-name">Nome do Template</Label>
            <Input
              id="template-name"
              placeholder="hello_world"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              O template deve estar aprovado na sua conta Meta
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Idioma</Label>
            <Select value={languageCode} onValueChange={setLanguageCode}>
              <SelectTrigger id="language">
                <SelectValue placeholder="Selecione o idioma" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="template-phone">Número de destino</Label>
          <Input
            id="template-phone"
            placeholder="+55 61 99999-9999"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Inclua o código do país (ex: 5561999999999)
          </p>
        </div>

        <Alert variant="default" className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/50 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Cuidado: Templates de teste são enviados de verdade e consomem créditos
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Button
            onClick={handleSendTemplate}
            disabled={isSending || !templateName.trim() || !phone.trim()}
          >
            {isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar Template de Teste
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
