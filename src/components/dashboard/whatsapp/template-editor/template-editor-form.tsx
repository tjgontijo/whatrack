'use client'

import React, { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ArrowLeft, Plus, Send, Trash2, Type, Image, Video, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { whatsappApi } from '@/lib/whatsapp/client'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { TemplatePreview } from './template-preview'
import type { WhatsAppTemplate } from '@/types/whatsapp/whatsapp'

// ─── Schema ──────────────────────────────────────────────────────────────────

const templateSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome obrigatório')
    .max(512)
    .regex(/^[a-z0-9_]+$/, 'Use apenas letras minúsculas, números e underscores'),
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']),
  language: z.string().min(2, 'Idioma obrigatório'),
  headerType: z.enum(['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT']),
  headerText: z.string().max(60).optional(),
  bodyText: z.string().min(1, 'Corpo obrigatório').max(1024),
  footerText: z.string().max(60).optional(),
  buttonType: z.enum(['NONE', 'URL', 'REPLY']),
  urlButtonText: z.string().optional(),
  urlButtonUrl: z.string().optional(),
  replyButtons: z.array(z.string()).optional(),
  samples: z.record(z.string(), z.string()).optional(),
})

type FormValues = z.infer<typeof templateSchema>

// ─── Variable helpers ─────────────────────────────────────────────────────────

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{([^}]+)\}\}/g) || []
  return [...new Set(matches.map((m) => m.slice(2, -2)))]
}

function applyVariables(text: string, samples: Record<string, string>): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, name) => samples[name] || `[${name}]`)
}

// ─── Component ───────────────────────────────────────────────────────────────

interface TemplateEditorFormProps {
  template?: WhatsAppTemplate | null
  initialCategory?: string
  initialLanguage?: string
  onClose: () => void
}

const CATEGORY_MAP: Record<string, 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'> = {
  Marketing: 'MARKETING',
  Utilidade: 'UTILITY',
  Autenticação: 'AUTHENTICATION',
}

const CATEGORY_LABEL: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
}


export function TemplateEditorForm({
  template,
  initialCategory,
  initialLanguage,
  onClose,
}: TemplateEditorFormProps) {
  const queryClient = useQueryClient()
  const { organizationId: orgId } = useRequiredProjectRouteContext()
  const isEdit = !!template

  const defaultValues = useMemo<FormValues>(() => {
    if (isEdit && template) {
      const header = template.components?.find((c) => c.type === 'HEADER')
      const body = template.components?.find((c) => c.type === 'BODY')
      const footer = template.components?.find((c) => c.type === 'FOOTER')
      const buttons = template.components?.find((c) => c.type === 'BUTTONS')

      return {
        name: template.name,
        category: template.category,
        language: template.language,
        headerType: (header?.format as any) || 'NONE',
        headerText: header?.text || '',
        bodyText: body?.text || '',
        footerText: footer?.text || '',
        buttonType: buttons ? (buttons.buttons?.[0]?.type === 'URL' ? 'URL' : 'REPLY') : 'NONE',
        urlButtonText: buttons?.buttons?.[0]?.text || '',
        urlButtonUrl: buttons?.buttons?.[0]?.url || '',
        replyButtons: buttons?.buttons?.map((b) => b.text) || [''],
        samples: {},
      }
    }
    const resolvedCategory = initialCategory
      ? (CATEGORY_MAP[initialCategory] ?? 'MARKETING')
      : 'MARKETING'
    return {
      name: '',
      category: resolvedCategory,
      language: initialLanguage || 'pt_BR',
      headerType: 'NONE',
      headerText: '',
      bodyText: '',
      footerText: '',
      buttonType: 'NONE',
      urlButtonText: '',
      urlButtonUrl: '',
      replyButtons: [''],
      samples: {},
    }
  }, [isEdit, template, initialCategory, initialLanguage])

  const form = useForm<FormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues,
  })

  const { watch, setValue, register, control, handleSubmit, formState } = form

  const name = watch('name')
  const category = watch('category')
  const language = watch('language')
  const headerType = watch('headerType')
  const headerText = watch('headerText') || ''
  const bodyText = watch('bodyText') || ''
  const footerText = watch('footerText') || ''
  const buttonType = watch('buttonType')
  const replyButtons = watch('replyButtons') || ['']
  const samples = watch('samples') || {}

  const bodyVariables = useMemo(() => extractVariables(bodyText), [bodyText])

  // Variable mode: 'name' = {{nome}}, 'number' = {{1}}, {{2}}…
  const [varMode, setVarMode] = useState<'name' | 'number'>('name')

  // Insert variable at cursor (or at end)
  const insertVariable = (varName: string) => {
    const textarea = document.getElementById('body-textarea') as HTMLTextAreaElement | null
    if (!textarea) {
      setValue('bodyText', bodyText + `{{${varName}}}`)
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = bodyText.slice(0, start)
    const after = bodyText.slice(end)
    setValue('bodyText', `${before}{{${varName}}}${after}`)
    setTimeout(() => {
      textarea.focus()
      const pos = start + varName.length + 4
      textarea.setSelectionRange(pos, pos)
    }, 0)
  }

  // ─── Mutation ─────────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const components: any[] = []

      // Header
      if (values.headerType !== 'NONE') {
        if (values.headerType === 'TEXT') {
          components.push({ type: 'header', format: 'text', text: values.headerText || '' })
        } else {
          components.push({ type: 'header', format: values.headerType.toLowerCase() })
        }
      }

      // Body — convert named vars to positional for Meta API
      const vars = extractVariables(values.bodyText)
      let metaBody = values.bodyText
      vars.forEach((name, i) => {
        metaBody = metaBody.replaceAll(`{{${name}}}`, `{{${i + 1}}}`)
      })
      const bodyComp: any = { type: 'body', text: metaBody }
      if (vars.length > 0) {
        const sampleValues = vars.map((v) => values.samples?.[v] || 'exemplo')
        bodyComp.example = { body_text: [sampleValues] }
      }
      components.push(bodyComp)

      // Footer
      if (values.footerText?.trim()) {
        components.push({ type: 'footer', text: values.footerText })
      }

      // Buttons
      if (values.buttonType === 'URL' && values.urlButtonText) {
        components.push({
          type: 'buttons',
          buttons: [{ type: 'URL', text: values.urlButtonText, url: values.urlButtonUrl || '' }],
        })
      } else if (values.buttonType === 'REPLY') {
        const btns = (values.replyButtons || []).filter(Boolean).slice(0, 3)
        if (btns.length > 0) {
          components.push({
            type: 'buttons',
            buttons: btns.map((text) => ({ type: 'QUICK_REPLY', text })),
          })
        }
      }

      if (isEdit && template?.id) {
        return whatsappApi.updateTemplate(template.id, components, orgId)
      }

      const payload: any = {
        name: values.name,
        category: values.category.toLowerCase(),
        language: values.language,
        components,
        parameter_format: 'named',
      }

      return whatsappApi.createTemplate(payload, orgId)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Template atualizado!' : 'Template enviado para análise!')
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'templates', orgId] })
      onClose()
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`)
    },
  })

  const onSubmit = handleSubmit((values) => mutation.mutate(values))

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col bg-background">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Rascunho
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={mutation.isPending}
            className="gap-2"
          >
            <Send className="h-3.5 w-3.5" />
            {mutation.isPending ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </div>

      {/* ── Three-column body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Column 1: Metadata (Narrow) ── */}
        <div className="w-64 shrink-0 border-r bg-muted/30 overflow-y-auto px-4 py-6 space-y-6">
          {/* Template Name */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Nome</Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="nome_do_template"
                  className="h-9 font-mono text-sm"
                />
              )}
            />
            {formState.errors.name && (
              <p className="text-xs text-destructive">{formState.errors.name.message}</p>
            )}
          </div>

          <Separator />

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Tipo</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MARKETING" className="text-sm">Marketing</SelectItem>
                    <SelectItem value="UTILITY" className="text-sm">Utilidade</SelectItem>
                    <SelectItem value="AUTHENTICATION" className="text-sm">Autenticação</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <Separator />

          {/* Language */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Idioma</Label>
            <Controller
              name="language"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt_BR" className="text-sm">Português (BR)</SelectItem>
                    <SelectItem value="en" className="text-sm">Inglês</SelectItem>
                    <SelectItem value="es" className="text-sm">Espanhol</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <Separator />

          {/* Variable Type */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Tipo de Variável</Label>
            <Select value={varMode} onValueChange={(val) => setVarMode(val as 'name' | 'number')}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name" className="text-sm">Texto</SelectItem>
                <SelectItem value="number" className="text-sm">Número</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Column 2: Content Editor (Large) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Header */}
          <div className="space-y-3">
            <Label className="font-semibold">Cabeçalho <span className="font-normal text-muted-foreground text-xs">(opcional)</span></Label>
            <Controller
              name="headerType"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'NONE', label: 'Nenhum', icon: null },
                    { value: 'TEXT', label: 'Texto', icon: Type },
                    { value: 'IMAGE', label: 'Imagem', icon: Image },
                    { value: 'VIDEO', label: 'Vídeo', icon: Video },
                  ].map((option) => {
                    const Icon = option.icon
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 p-3 text-xs font-medium transition-all ${
                          field.value === option.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-muted bg-muted/30 text-muted-foreground hover:border-muted-foreground'
                        }`}
                      >
                        {Icon && <Icon className="h-4 w-4" />}
                        <span className="text-center leading-tight">{option.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            />
            {headerType === 'TEXT' && (
              <Input
                {...register('headerText')}
                placeholder="Texto do cabeçalho"
                maxLength={60}
                className="text-sm mt-2"
              />
            )}
            {headerType === 'IMAGE' && (
              <div className="bg-muted rounded border border-dashed px-4 py-6 text-center text-xs text-muted-foreground mt-2">
                Upload de imagem será solicitado pela Meta na revisão
              </div>
            )}
            {headerType === 'VIDEO' && (
              <div className="bg-muted rounded border border-dashed px-4 py-6 text-center text-xs text-muted-foreground mt-2">
                Upload de vídeo será solicitado pela Meta na revisão
              </div>
            )}
          </div>

          {/* Body */}
          <div className="space-y-3">
            <Label className="font-semibold">Corpo <span className="text-destructive">*</span></Label>
            <Textarea
              id="body-textarea"
              {...register('bodyText')}
              placeholder="Olá {{nome do cliente}}, seu pedido {{número do pedido}} foi confirmado!"
              className="min-h-[120px] font-mono text-sm resize-none"
            />
            {formState.errors.bodyText && (
              <p className="text-xs text-destructive">{formState.errors.bodyText.message}</p>
            )}

            {/* Variable insertion */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => {
                  if (varMode === 'name') {
                    insertVariable('nome')
                  } else {
                    const count = bodyVariables.length + 1
                    insertVariable(`${count}`)
                  }
                }}
              >
                <Plus className="h-3 w-3" />
                Inserir variável
              </Button>
              {bodyVariables.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {bodyVariables.map((v) => (
                    <Badge key={v} variant="secondary" className="text-xs font-mono">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Variable samples */}
            {bodyVariables.length > 0 && (
              <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Exemplos de variáveis (obrigatório para aprovação)
                </p>
                {bodyVariables.map((varName) => (
                  <div key={varName} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 font-mono text-xs text-muted-foreground truncate">
                      {`{{${varName}}}`}
                    </span>
                    <Input
                      value={samples[varName] || ''}
                      onChange={(e) =>
                        setValue('samples', { ...samples, [varName]: e.target.value })
                      }
                      placeholder={`Exemplo para "${varName}"`}
                      className="h-7 text-xs"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Footer */}
          <div className="space-y-2">
            <Label className="font-semibold">
              Rodapé <span className="font-normal text-muted-foreground text-xs">(opcional)</span>
            </Label>
            <Input
              {...register('footerText')}
              placeholder="Ex: Não responda a esta mensagem"
              maxLength={60}
            />
          </div>

          <Separator />

          {/* Buttons */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">
                Botões <span className="font-normal text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <Controller
                name="buttonType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-7 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE" className="text-xs">Nenhum</SelectItem>
                      <SelectItem value="URL" className="text-xs">URL Button</SelectItem>
                      <SelectItem value="REPLY" className="text-xs">Reply Button</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {buttonType === 'URL' && (
              <div className="flex gap-2 rounded-lg border p-3">
                <Input {...register('urlButtonText')} placeholder="Texto do botão" className="text-sm w-40 shrink-0" />
                <Input {...register('urlButtonUrl')} placeholder="https://exemplo.com" className="text-sm flex-1" />
              </div>
            )}

            {buttonType === 'REPLY' && (
              <div className="space-y-2">
                {replyButtons.map((btn, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={btn}
                      onChange={(e) => {
                        const updated = [...replyButtons]
                        updated[i] = e.target.value
                        setValue('replyButtons', updated)
                      }}
                      placeholder={`Botão ${i + 1}`}
                      className="text-sm"
                      maxLength={25}
                    />
                    {replyButtons.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() =>
                          setValue('replyButtons', replyButtons.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {replyButtons.length < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => setValue('replyButtons', [...replyButtons, ''])}
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar botão
                  </Button>
                )}
              </div>
            )}
          </div>

        </div>

        {/* ── Column 3: Phone preview (Narrow) ── */}
        <div className="w-72 shrink-0 border-l bg-muted/20 overflow-y-auto flex items-start justify-center pt-6 px-3">
          <div className="w-full max-w-xs">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 text-center">Prévia</p>
            <TemplatePreview
              headerType={headerType}
              headerText={headerType === 'TEXT' ? applyVariables(headerText, samples) : ''}
              bodyText={applyVariables(bodyText, samples)}
              footerText={footerText}
              buttonType={buttonType}
              urlButtonText={watch('urlButtonText')}
              replyButtons={buttonType === 'REPLY' ? replyButtons.filter(Boolean) : []}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
