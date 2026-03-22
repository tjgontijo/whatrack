'use client'

import React, { useEffect, useState } from 'react'
import { useForm, FormProvider as Form, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { whatsappApi } from '@/lib/whatsapp/client'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Info, HelpCircle, Layout } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TemplatePreview } from './template-preview'
import type { WhatsAppTemplate } from '@/types/whatsapp/whatsapp'

const templateSchema = z.object({
  name: z
    .string()
    .min(1, 'O nome é obrigatório')
    .max(512, 'Máximo 512 caracteres')
    .regex(/^[a-z0-9_]+$/, 'Use apenas letras minúsculas, números e underscores'),
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']),
  language: z.string().min(2, 'Idioma é obrigatório'),
  headerText: z.string().max(60, 'Máximo 60 caracteres').optional(),
  bodyText: z
    .string()
    .min(1, 'O corpo da mensagem é obrigatório')
    .max(1024, 'Limite de 1024 caracteres'),
  footerText: z.string().max(60, 'Máximo 60 caracteres').optional(),
  samples: z.record(z.string(), z.string().min(1, 'Amostra obrigatória')).optional(),
})

type TemplateFormValues = z.infer<typeof templateSchema>

interface TemplateEditorFormProps {
  template?: WhatsAppTemplate | null
  onClose: () => void
}

import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'

export function TemplateEditorForm({ template, onClose }: TemplateEditorFormProps) {
  const queryClient = useQueryClient()
  const { organizationId: orgId } = useRequiredProjectRouteContext()
  const mode = template ? 'edit' : 'create'

  const defaultValues = React.useMemo(() => {
    if (mode === 'edit' && template) {
      const headerComponent = template.components?.find(
        (c: any) => c.type.toUpperCase() === 'HEADER'
      )
      const bodyComponent = template.components?.find((c: any) => c.type.toUpperCase() === 'BODY')
      const footerComponent = template.components?.find(
        (c: any) => c.type.toUpperCase() === 'FOOTER'
      )

      return {
        name: template.name,
        category: template.category as any,
        language: template.language,
        headerText: headerComponent?.text || '',
        bodyText: bodyComponent?.text || '',
        footerText: footerComponent?.text || '',
        samples: {},
      }
    }
    return {
      name: '',
      category: 'MARKETING' as const,
      language: 'pt_BR',
      headerText: '',
      bodyText: '',
      footerText: '',
      samples: {},
    }
  }, [mode, template])

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues,
    values: defaultValues,
  })

  const name = form.watch('name')
  const headerText = form.watch('headerText')
  const bodyText = form.watch('bodyText')
  const footerText = form.watch('footerText')
  const samples = form.watch('samples') || {}

  const variables = React.useMemo(() => {
    const matches = bodyText?.match(/\{\{[\w.]+\}\}/g) || []
    return Array.from(new Set(matches))
  }, [bodyText])

  const mutation = useMutation({
    mutationFn: (values: TemplateFormValues) => {
      const components: any[] = []

      if (values.headerText && values.headerText.trim() !== '') {
        components.push({ type: 'header', format: 'text', text: values.headerText })
      }

      const bodyComp: any = { type: 'body', text: values.bodyText }
      if (variables.length > 0) {
        const sampleValues = variables.map((v) => values.samples?.[v] || 'exemplo')
        bodyComp.example = { body_text: [sampleValues] }
      }
      components.push(bodyComp)

      if (values.footerText && values.footerText.trim() !== '') {
        components.push({ type: 'footer', text: values.footerText })
      }

      if (mode === 'edit' && template?.id) {
        return whatsappApi.updateTemplate(template.id, components, orgId!)
      }

      const payload = {
        name: values.name,
        category: values.category.toLowerCase(),
        language: values.language,
        components,
        parameter_format: 'positional',
      }
      return whatsappApi.createTemplate(payload, orgId!)
    },
    onSuccess: () => {
      toast.success(mode === 'create' ? 'Template enviado para análise!' : 'Template atualizado!')
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'templates', orgId] })
      onClose()
    },

    onError: (error: any) => {
      console.error('[TemplateForm] Erro:', error)
      toast.error(`Erro: ${error.message}`)
    },
  })

  function onSubmit(values: TemplateFormValues) {
    mutation.mutate(values)
  }

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden lg:flex-row">
      {/* Form Area */}
      <div className="scrollbar-thin scrollbar-thumb-muted flex-1 overflow-y-auto border-r p-8">
        <div className="mx-auto max-w-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* SECTION 1: Nome e idioma */}
              <section className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Controller
                    control={form.control}
                    name="name"
                    render={({ field, fieldState }) => (
                      <Field
                        data-invalid={fieldState.invalid}
                        className="space-y-1.5 md:col-span-2"
                      >
                        <FieldLabel className="text-sm font-bold">
                          Nome do modelo de mensagem
                        </FieldLabel>
                        <Input
                          placeholder="ex: boas_vindas_vendas"
                          className="bg-muted/30 border-muted-foreground/20 focus:bg-background h-11 rounded-xl font-medium transition-all"
                          {...field}
                          value={field.value ?? ''}
                          disabled={mode === 'edit'}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="category"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <FieldLabel className="text-sm font-bold">Categoria</FieldLabel>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="text-muted-foreground/60 h-4 w-4 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                className="bg-popover border-border max-w-[300px] rounded-2xl p-4 shadow-xl"
                              >
                                <div className="space-y-3">
                                  <div>
                                    <p className="mb-1 text-xs font-bold uppercase">Marketing</p>
                                    <p className="text-muted-foreground text-[11px]">
                                      Promoções e anúncios.
                                    </p>
                                  </div>
                                  <div>
                                    <p className="mb-1 text-xs font-bold uppercase">Utilidade</p>
                                    <p className="text-muted-foreground text-[11px]">
                                      Informa sobre transações e pedidos.
                                    </p>
                                  </div>
                                  <div>
                                    <p className="mb-1 text-xs font-bold uppercase">Autenticação</p>
                                    <p className="text-muted-foreground text-[11px]">
                                      Códigos de segurança (OTP).
                                    </p>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={mode === 'edit'}
                        >
                          <SelectTrigger className="bg-muted/30 border-muted-foreground/20 h-11 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MARKETING">Marketing</SelectItem>
                            <SelectItem value="UTILITY">Utilidade</SelectItem>
                            <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="language"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid} className="space-y-1.5">
                        <FieldLabel className="text-sm font-bold">Idioma</FieldLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={mode === 'edit'}
                        >
                          <SelectTrigger className="bg-muted/30 border-muted-foreground/20 h-11 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pt_BR">Português (Brasil)</SelectItem>
                            <SelectItem value="en_US">English (US)</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />
                </div>
              </section>

              <Separator />

              {/* SECTION 2: Conteúdo */}
              <section className="space-y-6">
                <Controller
                  control={form.control}
                  name="headerText"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <FieldLabel className="text-muted-foreground text-xs font-bold uppercase">
                          Cabeçalho (Opcional)
                        </FieldLabel>
                        <span className="text-muted-foreground text-[10px] tabular-nums">
                          {field.value?.length || 0}/60
                        </span>
                      </div>
                      <Input
                        placeholder="Título da mensagem"
                        className="bg-muted/30 border-muted-foreground/20 h-11 rounded-xl"
                        {...field}
                        value={field.value ?? ''}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="bodyText"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="space-y-1.5">
                      <div className="flex justify-between">
                        <FieldLabel className="text-muted-foreground text-xs font-bold uppercase">
                          Corpo da Mensagem
                        </FieldLabel>
                        <span className="text-muted-foreground text-[10px] font-bold tabular-nums">
                          {field.value?.length || 0} / 1024
                        </span>
                      </div>
                      <Textarea
                        placeholder="Digite o conteúdo. Use {{1}}, {{2}} para variáveis."
                        className="bg-muted/30 border-muted-foreground/20 min-h-[140px] resize-none rounded-2xl p-4 text-base"
                        {...field}
                      />
                      <div className="flex items-center gap-1.5 px-0.5 pt-0.5">
                        <Info className="text-primary/60 h-3 w-3" />
                        <p className="text-muted-foreground text-[10px] font-medium">
                          As variáveis {'{{1}}, {{2}}'}, etc. serão substituídas por dados reais.
                        </p>
                      </div>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="footerText"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <FieldLabel className="text-muted-foreground text-xs font-bold uppercase">
                          Rodapé (Opcional)
                        </FieldLabel>
                        <span className="text-muted-foreground text-[10px] tabular-nums">
                          {field.value?.length || 0}/60
                        </span>
                      </div>
                      <Input
                        placeholder="Legenda no final da mensagem"
                        className="bg-muted/30 border-muted-foreground/20 h-11 rounded-xl"
                        {...field}
                        value={field.value ?? ''}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </section>

              {/* SECTION 3: Amostras */}
              {variables.length > 0 && (
                <section className="space-y-4 pt-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-muted-foreground text-sm font-bold uppercase">
                      Amostras de Variáveis
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {variables.map((v) => {
                      const varNumber = v.replace(/\{\{|\}\}/g, '')
                      return (
                        <Controller
                          key={v}
                          control={form.control}
                          name={`samples.${varNumber}` as any}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="space-y-1.5">
                              <FieldLabel className="text-muted-foreground text-[10px] font-bold">
                                Valor para {v}
                              </FieldLabel>
                              <Input
                                placeholder="Exemplo de conteúdo"
                                className="bg-muted/10 border-muted-foreground/10 h-10 rounded-xl text-sm"
                                {...field}
                                value={field.value ?? ''}
                              />
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Form Buttons */}
              <div className="flex items-center gap-3 pt-6">
                <Button
                  type="submit"
                  size="lg"
                  className="bg-primary h-11 px-8 font-bold"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? 'Enviando...' : 'Enviar para análise'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  className="text-muted-foreground h-11 px-6"
                  onClick={onClose}
                  disabled={mutation.isPending}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {/* Preview Area */}
      <div className="bg-muted/5 hidden h-full w-[440px] flex-col items-center overflow-hidden border-l lg:flex">
        <div className="flex w-full flex-1 flex-col space-y-6 overflow-hidden p-8">
          <div className="border-muted flex w-full items-center gap-2 border-b pb-4">
            <Layout className="text-muted-foreground h-4 w-4" />
            <h4 className="text-muted-foreground/80 text-xs font-bold uppercase tracking-widest">
              Prévia no WhatsApp
            </h4>
          </div>

          <div className="relative mx-auto h-[600px] w-full max-w-[300px] overflow-hidden rounded-[3rem] border-[10px] border-slate-900 bg-slate-900 shadow-2xl ring-1 ring-white/10">
            <div className="relative h-full overflow-hidden bg-[#0b141a]">
              <TemplatePreview
                templateName={name}
                headerText={headerText}
                bodyText={bodyText}
                footerText={footerText}
                samples={samples}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
