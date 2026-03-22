'use client'

import React from 'react'
import { Send, Smartphone, CheckCircle2, MessageSquare, Code } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { whatsappApi } from '@/lib/whatsapp/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { WhatsAppPhoneNumber, WhatsAppTemplate } from '@/types/whatsapp/whatsapp'

interface SendTestViewProps {
  phone: WhatsAppPhoneNumber
}

import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'

export function SendTestView({ phone }: SendTestViewProps) {
  const { organizationId: orgId } = useRequiredProjectRouteContext()
  const [recipientPhone, setRecipientPhone] = React.useState('')
  const [selectedTemplateName, setSelectedTemplateName] = React.useState('')
  const [variables, setVariables] = React.useState<string[]>([])
  const [lastResponse, setLastResponse] = React.useState<any>(null)

  const { data: templates } = useQuery<WhatsAppTemplate[]>({
    queryKey: ['whatsapp', 'templates', orgId],
    queryFn: () => whatsappApi.getTemplates(orgId!),
    enabled: !!orgId,
  })

  const approvedTemplates = templates?.filter((t) => t.status === 'APPROVED') || []
  const selectedTemplate = approvedTemplates.find((t) => t.name === selectedTemplateName)

  const templateVariables = React.useMemo(() => {
    const bodyText = selectedTemplate?.components?.find((c) => c.type === 'BODY')?.text || ''
    const matches = bodyText.match(/\{\{[\w.]+\}\}/g) || []
    return Array.from(new Set(matches))
  }, [selectedTemplate])

  const sendMutation = useMutation({
    mutationFn: ({ to, template }: { to: string; template: string }) =>
      whatsappApi.sendTemplate(
        to,
        template,
        orgId!,
        selectedTemplate?.language,
        variables.length > 0
          ? templateVariables.map((v, i) => ({
              name: v.replace(/\{\{|\}\}/g, ''),
              value: variables[i] ?? '',
            }))
          : undefined,
      ),

    onSuccess: (data) => {
      setLastResponse(data)
      toast.success('Mensagem enviada com sucesso!', {
        description: `Template entregue para ${recipientPhone}`,
      })
      setRecipientPhone('')
    },
    onError: (error: any) => {
      setLastResponse({ error: error.message || 'Erro desconhecido' })
      toast.error('Falha no envio', {
        description: error.message || 'Tente novamente mais tarde.',
      })
    },
  })

  const handleSend = () => {
    if (!recipientPhone || !selectedTemplateName) {
      toast.error('Preencha todos os campos')
      return
    }
    sendMutation.mutate({ to: recipientPhone, template: selectedTemplateName })
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 grid grid-cols-1 gap-8 duration-500 lg:grid-cols-3">
      {/* Formulário de Envio */}
      <div className="space-y-6 lg:col-span-2">
        <Card className="border-primary/20 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Send className="text-primary h-5 w-5" />
              <CardTitle>Nova Mensagem</CardTitle>
            </div>
            <CardDescription>
              Envie mensagens de teste para validar seus templates aprovados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <Label htmlFor="template">Template Aprovado</Label>
              <Select
                value={selectedTemplateName}
                onValueChange={(v) => {
                  setSelectedTemplateName(v)
                  setVariables([])
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione um template..." />
                </SelectTrigger>
                <SelectContent>
                  {approvedTemplates.map((t) => (
                    <SelectItem key={t.name} value={t.name}>
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="font-medium">{t.name}</span>
                        <span className="text-muted-foreground text-xs uppercase">
                          {t.language}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-[11px] font-medium">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Mostrando apenas templates aprovados pela Meta
              </p>
            </div>

            {templateVariables.length > 0 && (
              <div className="space-y-2">
                <Label>Variáveis do Template</Label>
                {templateVariables.map((v, i) => (
                  <div key={v} className="flex items-center gap-2">
                    <span className="text-muted-foreground w-fit shrink-0 text-right text-xs font-mono">{v}</span>
                    <Input
                      placeholder={`Valor para ${v}`}
                      className="h-9"
                      value={variables[i] ?? ''}
                      onChange={(e) => {
                        const next = [...variables]
                        next[i] = e.target.value
                        setVariables(next)
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone do Destinatário</Label>
              <div className="relative">
                <Smartphone className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <Input
                  id="phone"
                  placeholder="+55 11 99999-9999"
                  className="h-11 pl-9"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Utilize o formato internacional (ex: +55...)
              </p>
            </div>

            <div className="pt-4">
              <Button
                className="h-11 w-full text-base font-bold shadow-md transition-all hover:shadow-lg"
                onClick={handleSend}
                disabled={sendMutation.isPending || !recipientPhone || !selectedTemplateName}
              >
                {sendMutation.isPending ? 'Enviando...' : 'Enviar Mensagem de Teste'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resposta da API JSON */}
        {lastResponse && (
          <Card className="border-muted bg-muted/10 animate-in fade-in slide-in-from-top-2 overflow-hidden duration-300">
            <CardHeader className="bg-muted/20 border-b px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="text-muted-foreground h-4 w-4" />
                  <CardTitle className="text-sm font-bold">Resposta da API (Meta Cloud)</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 h-7 gap-1 text-[10px] font-bold uppercase tracking-wider"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(lastResponse, null, 2))
                      toast.success('JSON copiado!')
                    }}
                  >
                    Copiar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 h-7 text-[10px] font-bold uppercase tracking-wider"
                    onClick={() => setLastResponse(null)}
                  >
                    Limpar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="scrollbar-hide max-h-[300px] overflow-x-auto bg-black/5 p-4 font-mono text-[11px] leading-relaxed dark:bg-white/5">
                {JSON.stringify(lastResponse, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Preview do Dispositivo */}
      <div className="relative mx-auto w-[280px] max-w-[320px] lg:w-full">
        <div className="relative h-[580px] w-full rounded-[2.5rem] border-[12px] border-gray-800 bg-gray-800 shadow-xl">
          <div className="absolute -start-[15px] top-[72px] h-[32px] w-[3px] rounded-s-lg border border-r-0 border-gray-600 bg-gray-800 opacity-40"></div>
          <div className="absolute -start-[15px] top-[124px] h-[46px] w-[3px] rounded-s-lg border border-r-0 border-gray-600 bg-gray-800 opacity-40"></div>
          <div className="absolute -start-[15px] top-[178px] h-[46px] w-[3px] rounded-s-lg border border-r-0 border-gray-600 bg-gray-800 opacity-40"></div>
          <div className="absolute -end-[15px] top-[142px] h-[64px] w-[3px] rounded-e-lg border border-l-0 border-gray-600 bg-gray-800 opacity-40"></div>

          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[1.8rem] bg-[#E5DDD5]">
            {/* Header do WhatsApp Mock */}
            <div className="z-10 flex h-16 w-full items-center gap-3 bg-[#075E54] px-4 pt-4 text-white shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                {phone.display_phone_number.slice(-2)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-bold">{phone.verified_name}</p>
                <p className="text-[10px] opacity-80">Conta Comercial</p>
              </div>
            </div>

            {/* Corpo da Mensagem Mock */}
            <div className="flex-1 overflow-y-auto p-3">
              {selectedTemplate ? (
                <div className="relative max-w-[90%] rounded-lg rounded-tl-none bg-white p-3 text-sm text-gray-800 shadow-sm">
                  <div className="mb-1 text-xs font-bold text-[#075E54]">
                    {selectedTemplate.category.replace('_', ' ')}
                  </div>
                  <p className="whitespace-pre-wrap">
                    {/* Tentativa de mostrar o corpo, fallback para um texto genérico */}
                    {selectedTemplate.components?.find((c: any) => c.type === 'BODY')?.text ||
                      'Conteúdo do template será exibido aqui...'}
                  </p>
                  <span className="mt-1 block text-right text-[10px] text-gray-400">Agora</span>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400 opacity-60">
                  <MessageSquare className="h-8 w-8" />
                  <p className="px-4 text-center text-xs">
                    Selecione um template para ver a prévia
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
