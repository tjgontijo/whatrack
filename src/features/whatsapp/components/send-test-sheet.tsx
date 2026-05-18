'use client'

import { useQuery } from '@tanstack/react-query'
import { CheckCheck, Send } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CrudEditDrawer } from '@/features/dashboard/components/crud'
import type { WhatsAppInstance } from '@/features/whatsapp/components/settings/instance-card-detail'
import { whatsappApi } from '@/features/whatsapp/lib/client'
import { applyWhatsAppMask, removeWhatsAppMask } from '@/lib/mask/phone-mask'

interface SendTestSheetProps {
  phone: WhatsAppInstance
  organizationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTemplate?: string
}

export function SendTestSheet({
  phone,
  organizationId,
  open,
  onOpenChange,
  initialTemplate,
}: SendTestSheetProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(initialTemplate)
  const [targetNumber, setTargetNumber] = useState('')
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: approvedTemplates = [] } = useQuery({
    queryKey: ['whatsapp', 'templates', organizationId],
    queryFn: async () => {
      const templates = await whatsappApi.getTemplates(organizationId)
      return templates.filter((t) => t.status === 'APPROVED')
    },
    enabled: open,
  })

  const selectedTemplate = approvedTemplates.find((t) => t.name === selectedTemplateId)

  const getBodyText = (): string => {
    const body = selectedTemplate?.components?.find((c: any) => c.type === 'BODY')
    return (body as any)?.text || ''
  }

  const getVariableNames = (body: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g
    const matches: string[] = []
    let match
    while ((match = regex.exec(body)) !== null) matches.push(match[1])
    return [...new Set(matches)]
  }

  const bodyText = getBodyText()
  const templateVariables = bodyText ? getVariableNames(bodyText) : []

  const getPreview = () => {
    if (!bodyText) return ''
    let preview = bodyText
    templateVariables.forEach((v) => {
      preview = preview.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), variables[v] || `[${v}]`)
    })
    return preview
  }

  const now = new Date()
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const handleSend = async () => {
    if (!selectedTemplate || !targetNumber) return
    setIsSubmitting(true)
    try {
      const digits = removeWhatsAppMask(targetNumber)
      await whatsappApi.sendTemplate(
        digits,
        selectedTemplate.name,
        organizationId,
        'pt_BR',
        templateVariables.map((name) => ({ name, value: variables[name] || '' }))
      )
      onOpenChange(false)
      setTargetNumber('')
      setVariables({})
      setSelectedTemplateId(undefined)
    } catch (error) {
      console.error('Failed to send test message:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const headerComponent = selectedTemplate?.components?.find((c: any) => c.type === 'HEADER') as any
  const footerComponent = selectedTemplate?.components?.find((c: any) => c.type === 'FOOTER') as any
  const buttonComponents = selectedTemplate?.components?.find(
    (c: any) => c.type === 'BUTTONS'
  ) as any

  return (
    <CrudEditDrawer
      open={open}
      onOpenChange={onOpenChange}
      title='Enviar Mensagem de Teste'
      subtitle={`De: ${phone.verifiedName} · ${phone.displayPhone}`}
      icon={Send}
      onSave={handleSend}
      isSaving={isSubmitting}
      saveLabel='Enviar Mensagem'
      desktopDirection='right'
    >
      <div className='space-y-5'>
        {/* ── 1. Preview ── */}
        <div className='space-y-2'>
          <Label className='font-semibold text-muted-foreground text-xs uppercase tracking-widest'>
            Preview
          </Label>
          {selectedTemplate ? (
            <div
              className='overflow-hidden rounded-xl border'
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23e5e7eb' opacity='0.6'/%3E%3C/svg%3E")`,
                backgroundColor: '#f0f2f5',
              }}
            >
              {/* Chat bar */}
              <div className='flex items-center gap-2.5 bg-[#075e54] px-3 py-2.5 text-white'>
                <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 font-bold text-xs'>
                  {phone.verifiedName.charAt(0).toUpperCase()}
                </div>
                <div className='min-w-0'>
                  <div className='truncate font-semibold text-xs leading-none'>
                    {phone.verifiedName}
                  </div>
                  <div className='mt-0.5 text-[10px] opacity-70'>WhatsApp Business</div>
                </div>
              </div>
              {/* Messages */}
              <div className='flex flex-col gap-1 p-3'>
                <div className='flex justify-end'>
                  <div
                    className='max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2 shadow-sm'
                    style={{ background: '#dcf8c6' }}
                  >
                    {headerComponent?.format === 'IMAGE' && (
                      <div className='mb-1.5 flex h-20 items-center justify-center rounded-lg bg-black/10 text-black/40 text-xs'>
                        📷 Imagem
                      </div>
                    )}
                    {headerComponent?.text && (
                      <p className='mb-1 font-semibold text-[#111b21] text-xs'>
                        {headerComponent.text}
                      </p>
                    )}
                    <p className='whitespace-pre-wrap text-[#111b21] text-xs leading-relaxed'>
                      {getPreview()}
                    </p>
                    {footerComponent?.text && (
                      <p className='mt-1 text-[#111b21]/50 text-[10px]'>{footerComponent.text}</p>
                    )}
                    <div className='mt-1 flex items-center justify-end gap-1'>
                      <span className='text-[#111b21]/50 text-[9px]'>{timeStr}</span>
                      <CheckCheck className='h-3 w-3 text-[#53bdeb]' />
                    </div>
                  </div>
                </div>
                {buttonComponents?.buttons?.map((btn: any, i: number) => (
                  <div key={i} className='flex justify-end'>
                    <div className='rounded-xl border bg-white/90 px-3 py-1 font-medium text-[#075e54] text-[10px] shadow-sm'>
                      {btn.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-8'>
              <div className='flex h-9 w-9 items-center justify-center rounded-full bg-muted'>
                <Send className='h-3.5 w-3.5 text-muted-foreground' />
              </div>
              <p className='text-muted-foreground text-xs'>
                Selecione um template para ver o preview
              </p>
            </div>
          )}
        </div>

        {/* ── 2. Template ── */}
        <div className='space-y-2'>
          <Label className='font-semibold text-muted-foreground text-xs uppercase tracking-widest'>
            Template
          </Label>
          <Select
            value={selectedTemplateId ?? ''}
            onValueChange={(v) => {
              setSelectedTemplateId(v)
              setVariables({})
            }}
          >
            <SelectTrigger className='h-10 w-full'>
              <SelectValue placeholder='Selecionar template aprovado...' />
            </SelectTrigger>
            <SelectContent>
              {approvedTemplates.map((t) => (
                <SelectItem key={t.name} value={t.name}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── 3. Variables ── */}
        {templateVariables.length > 0 && (
          <div className='space-y-2'>
            <Label className='font-semibold text-muted-foreground text-xs uppercase tracking-widest'>
              Variáveis
            </Label>
            {templateVariables.map((varName) => (
              <div key={varName} className='space-y-1'>
                <Label className='text-muted-foreground text-xs'>{varName}</Label>
                <Input
                  placeholder={`Valor de ${varName}`}
                  value={variables[varName] || ''}
                  onChange={(e) => setVariables((prev) => ({ ...prev, [varName]: e.target.value }))}
                  className='h-9'
                />
              </div>
            ))}
          </div>
        )}

        {/* ── 4. Destino ── */}
        <div className='space-y-2'>
          <Label className='font-semibold text-muted-foreground text-xs uppercase tracking-widest'>
            Número Destino (DDI + DDD + Número)
          </Label>
          <Input
            placeholder='5511999999999'
            value={targetNumber}
            onChange={(e) => setTargetNumber(applyWhatsAppMask(e.target.value))}
            className='h-10'
            maxLength={18}
          />
          <p className='text-muted-foreground text-xs'>
            Inicie com o código do país (ex: 55 para Brasil). Não adicione o símbolo +.
          </p>
        </div>
      </div>
    </CrudEditDrawer>
  )
}
