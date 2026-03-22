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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
  bodyText: z.string().min(1, 'Corpo obrigatório').max(1024, 'Máximo 1.024 caracteres'),
  footerText: z.string().max(60).optional(),
  buttons: z.array(z.object({
    type: z.enum(['URL', 'REPLY']),
    text: z.string().min(1).max(25),
    url: z.string().optional(),
  })).optional(),
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
      const buttonsComp = template.components?.find((c) => c.type === 'BUTTONS')

      return {
        name: template.name,
        category: template.category,
        language: template.language,
        headerType: (header?.format as any) || 'NONE',
        headerText: header?.text || '',
        bodyText: body?.text || '',
        footerText: footer?.text || '',
        buttons: buttonsComp?.buttons?.map((b: any) => ({
          type: b.type === 'URL' ? 'URL' : 'REPLY',
          text: b.text,
          url: b.url || '',
        })) || [],
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
      buttons: [],
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
  const buttons = watch('buttons') || []
  const samples = watch('samples') || {}

  const bodyVariables = useMemo(() => extractVariables(bodyText), [bodyText])

  // Variable mode: determines format (name or number)
  const [varMode, setVarMode] = useState<'name' | 'number'>('name')

  // Popover state for add-button affordance
  const [addBtnOpen, setAddBtnOpen] = useState(false)

  // Insert variable at cursor (or at end)
  const insertVariable = () => {
    const varName = varMode === 'name' ? 'nome_variavel' : `${bodyVariables.length + 1}`
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

      // Body — keep variables in snake_case format as required by Meta
      const vars = extractVariables(values.bodyText)
      const bodyComp: any = { type: 'body', text: values.bodyText }
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
      if (values.buttons && values.buttons.length > 0) {
        const urlButtons = values.buttons.filter((b) => b.type === 'URL')
        const replyButtons = values.buttons.filter((b) => b.type === 'REPLY').slice(0, 3)

        const buttonsList: any[] = []

        // Add URL buttons (max 1)
        if (urlButtons.length > 0) {
          buttonsList.push({
            type: 'URL',
            text: urlButtons[0].text,
            url: urlButtons[0].url || '',
          })
        }

        // Add reply buttons (max 3)
        replyButtons.forEach((btn) => {
          buttonsList.push({
            type: 'QUICK_REPLY',
            text: btn.text,
          })
        })

        if (buttonsList.length > 0) {
          components.push({
            type: 'buttons',
            buttons: buttonsList,
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
        parameter_format: varMode === 'name' ? 'named' : 'positional',
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

  // Save draft locally in browser storage
  const saveDraft = () => {
    const draftKey = `template_draft_${isEdit ? template?.id : 'new'}`
    const draftData = {
      ...form.getValues(),
      varMode,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem(draftKey, JSON.stringify(draftData))
    toast.success('Rascunho salvo!')
  }

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
          <Button
            variant="outline"
            size="sm"
            onClick={saveDraft}
            type="button"
          >
            Rascunho
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={mutation.isPending}
            className="gap-2"
          >
            <Send className="h-3.5 w-3.5" />
            {mutation.isPending ? 'Enviando...' : 'Enviar para Análise'}
          </Button>
        </div>
      </div>

      {/* ── Three-column body ── */}
      <div className="flex flex-1 min-h-0">
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
            <Select value={varMode} onValueChange={(value) => setVarMode(value as 'name' | 'number')}>
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

        {/* ── Column 2: Content Editor ── */}
        <div className="flex-[0.70] px-6 py-6 space-y-6">

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
            <div className="relative">
              <Textarea
                id="body-textarea"
                {...register('bodyText')}
                className="min-h-[120px] font-mono text-sm resize-none pr-20"
              />
              <span className={`absolute bottom-3 right-3 text-xs font-medium pointer-events-none ${bodyText.length > 900 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                {bodyText.length}/1.024
              </span>
            </div>
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
                onClick={() => insertVariable()}
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">
                Botões <span className="font-normal text-muted-foreground text-xs">(opcional)</span>
              </Label>
              {buttons.length > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">{buttons.length}/10</span>
              )}
            </div>

            {/* Button rows */}
            {buttons.length > 0 && (
              <div className="space-y-1">
                {buttons.map((btn, i) => (
                  <div
                    key={i}
                    className="group flex items-start gap-2 rounded-lg border bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    {/* Type pill */}
                    <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide leading-none ${
                      btn.type === 'URL'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {btn.type === 'URL' ? 'URL' : 'Reply'}
                    </span>

                    {/* Inputs */}
                    {btn.type === 'URL' ? (
                      <div className="flex flex-1 items-center gap-2 min-w-0">
                        <Input
                          value={btn.text}
                          onChange={(e) => {
                            const updated = buttons.map((b, j) => j === i ? { ...b, text: e.target.value } : b)
                            setValue('buttons', updated)
                          }}
                          placeholder="Texto"
                          className="h-7 w-[20%] shrink-0 text-xs border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                          maxLength={25}
                        />
                        <span className="text-muted-foreground/30 text-xs shrink-0">|</span>
                        <Input
                          value={btn.url || ''}
                          onChange={(e) => {
                            const updated = buttons.map((b, j) => j === i ? { ...b, url: e.target.value } : b)
                            setValue('buttons', updated)
                          }}
                          placeholder="https://exemplo.com"
                          className="h-7 flex-1 min-w-0 text-xs border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 text-muted-foreground placeholder:text-muted-foreground/40"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <Input
                          value={btn.text}
                          onChange={(e) => {
                            const updated = buttons.map((b, j) => j === i ? { ...b, text: e.target.value } : b)
                            setValue('buttons', updated)
                          }}
                          placeholder="Texto da opção"
                          className="h-7 text-xs border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                          maxLength={25}
                        />
                      </div>
                    )}

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => setValue('buttons', buttons.filter((_, j) => j !== i))}
                      className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add button — dashed popover trigger */}
            {buttons.length < 10 && (
              <Popover open={addBtnOpen} onOpenChange={setAddBtnOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/25 py-2 text-xs text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar botão
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-1.5" align="start">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => {
                      setValue('buttons', [...buttons, { type: 'REPLY', text: '', url: '' }])
                      setAddBtnOpen(false)
                    }}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-bold">R</span>
                    Resposta Rápida
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => {
                      setValue('buttons', [...buttons, { type: 'URL', text: '', url: '' }])
                      setAddBtnOpen(false)
                    }}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-500/10 text-[10px] font-bold text-blue-600 dark:text-blue-400">↗</span>
                    Acessar o Site
                  </button>
                </PopoverContent>
              </Popover>
            )}
          </div>

        </div>

        {/* ── Column 3: Phone preview (Large) ── */}
        <div className="flex-[0.35] border-l bg-muted/20 flex items-start justify-center pt-6 px-3 self-start sticky top-0 max-h-screen overflow-y-auto">
          <div className="w-full max-w-md">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 text-center">Prévia</p>
            <TemplatePreview
              headerType={headerType}
              headerText={headerType === 'TEXT' ? applyVariables(headerText, samples) : ''}
              bodyText={applyVariables(bodyText, samples)}
              footerText={footerText}
              previewButtons={buttons
                .filter((b) => b.text)
                .map((b) => ({ type: b.type, text: b.text }))}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
