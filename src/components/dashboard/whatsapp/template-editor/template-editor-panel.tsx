'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { FormProvider as Form, Controller } from 'react-hook-form'
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/field'
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
import { Info, Sparkles, X } from 'lucide-react'
import { TemplatePreview } from './template-preview'
import type { WhatsAppTemplate } from '@/types/whatsapp'
import { ScrollArea } from '@/components/ui/scroll-area'

const templateSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(512, 'Nome muito longo')
    .regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e underscores'),
  category: z.enum(['MARKETING', 'UTILITY']),
  language: z.string().min(2, 'Idioma é obrigatório'),
  bodyText: z
    .string()
    .min(1, 'O corpo da mensagem é obrigatório')
    .max(1024, 'Limite de 1024 caracteres'),
  samples: z.record(z.string(), z.string().min(1, 'Amostra obrigatória')).optional(),
})

type TemplateFormValues = z.infer<typeof templateSchema>

interface TemplateEditorPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: WhatsAppTemplate | null
  mode: 'create' | 'edit'
}

export function TemplateEditorPanel({
  open,
  onOpenChange,
  template,
  mode,
}: TemplateEditorPanelProps) {
  const queryClient = useQueryClient()

  const defaultValues = React.useMemo(() => {
    if (mode === 'edit' && template) {
      const bodyComponent = template.components?.find((c: any) => c.type === 'BODY')
      return {
        name: template.name,
        category: template.category as 'MARKETING' | 'UTILITY',
        language: template.language,
        bodyText: bodyComponent?.text || '',
        samples: {},
      }
    }
    return {
      name: '',
      category: 'UTILITY' as const,
      language: 'pt_BR',
      bodyText: '',
      samples: {},
    }
  }, [mode, template])

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues,
    values: defaultValues,
  })

  const bodyText = form.watch('bodyText')
  const samples = form.watch('samples') || {}

  // Detect variables in real-time
  const variables = React.useMemo(() => {
    const matches = bodyText?.match(/\{\{(\d+)\}\}/g) || []
    return Array.from(new Set(matches)).sort((a, b) => {
      const numA = parseInt(a.replace(/\{\{|\}\}/g, ''))
      const numB = parseInt(b.replace(/\{\{|\}\}/g, ''))
      return numA - numB
    })
  }, [bodyText])

  const mutation = useMutation({
    mutationFn: (values: TemplateFormValues) => {
      const components: any[] = [
        {
          type: 'BODY',
          text: values.bodyText,
        },
      ]

      if (variables.length > 0) {
        const sampleValues = variables.map((v) => values.samples?.[v] || 'exemplo')
        components[0].example = {
          body_text: [sampleValues],
        }
      }

      const payload = {
        name: values.name,
        category: values.category,
        language: values.language,
        components,
      }

      return whatsappApi.createTemplate(payload)
    },
    onSuccess: () => {
      toast.success(
        mode === 'create'
          ? 'Template criado! Aguardando aprovação da Meta.'
          : 'Template atualizado com sucesso!'
      )
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'templates'] })
      onOpenChange(false)
      form.reset()
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`)
    },
  })

  function onSubmit(values: TemplateFormValues) {
    mutation.mutate(values)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-[90vw] lg:max-w-[1400px]">
        <div className="grid h-full grid-cols-1 lg:grid-cols-2">
          {/* Left: Form */}
          <div className="bg-background flex flex-col border-r">
            <SheetHeader className="border-b px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle className="text-2xl">
                    {mode === 'create' ? 'Novo Template' : 'Editar Template'}
                  </SheetTitle>
                  <SheetDescription className="mt-1.5">
                    {mode === 'create'
                      ? 'Crie uma mensagem reutilizável para seus clientes'
                      : 'Atualize seu template de mensagem'}
                  </SheetDescription>
                </div>
                <Badge variant="secondary" className="gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Meta Review
                </Badge>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="px-8 py-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {/* Basic Info Section */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="mb-1 text-sm font-semibold">Informações Básicas</h3>
                        <p className="text-muted-foreground text-xs">
                          Configure os metadados do seu template
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Controller
                          control={form.control}
                          name="name"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="col-span-2">
                              <FieldLabel htmlFor={field.name}>Nome do Template *</FieldLabel>
                              <Input
                                id={field.name}
                                placeholder="ex: confirmacao_pedido"
                                {...field}
                                disabled={mode === 'edit'}
                                className="font-mono text-sm"
                              />
                              <FieldDescription className="text-xs">
                                Use snake_case. Não pode ser alterado após criação.
                              </FieldDescription>
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />

                        <Controller
                          control={form.control}
                          name="category"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel htmlFor={field.name}>Categoria *</FieldLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger id={field.name}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="UTILITY">
                                    <div className="flex flex-col items-start">
                                      <span className="font-medium">Utilidade</span>
                                      <span className="text-muted-foreground text-xs">
                                        Confirmações, atualizações
                                      </span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="MARKETING">
                                    <div className="flex flex-col items-start">
                                      <span className="font-medium">Marketing</span>
                                      <span className="text-muted-foreground text-xs">
                                        Promoções, ofertas
                                      </span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />

                        <Controller
                          control={form.control}
                          name="language"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel htmlFor={field.name}>Idioma *</FieldLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger id={field.name}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pt_BR">Português (BR)</SelectItem>
                                  <SelectItem value="en_US">English (US)</SelectItem>
                                  <SelectItem value="es">Español</SelectItem>
                                </SelectContent>
                              </Select>
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Message Content Section */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="mb-1 text-sm font-semibold">Conteúdo da Mensagem</h3>
                        <p className="text-muted-foreground text-xs">
                          Escreva o texto que será enviado aos seus clientes
                        </p>
                      </div>

                      <Controller
                        control={form.control}
                        name="bodyText"
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name}>Corpo da Mensagem *</FieldLabel>
                            <Textarea
                              id={field.name}
                              placeholder="Olá {{1}}, confirmamos seu pedido #{{2}}. Previsão de entrega: {{3}}."
                              className="min-h-[120px] resize-none font-sans text-sm leading-relaxed"
                              {...field}
                            />
                            <FieldDescription className="flex items-start gap-2 text-xs">
                              <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                              <span>
                                Use <code className="bg-muted rounded px-1">{'{{1}}'}</code>,
                                <code className="bg-muted ml-1 rounded px-1">{'{{2}}'}</code> para
                                variáveis. Máximo 1024 caracteres.
                              </span>
                            </FieldDescription>
                            <div className="mt-1 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {variables.length}{' '}
                                {variables.length === 1
                                  ? 'variável detectada'
                                  : 'variáveis detectadas'}
                              </span>
                              <span
                                className={`font-mono ${field.value?.length > 1024 ? 'text-destructive' : 'text-muted-foreground'}`}
                              >
                                {field.value?.length || 0}/1024
                              </span>
                            </div>
                            <FieldError errors={[fieldState.error]} />
                          </Field>
                        )}
                      />
                    </div>

                    {variables.length > 0 && (
                      <>
                        <Separator />

                        <div className="animate-in fade-in slide-in-from-top-1 space-y-4 duration-300">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="mb-1 text-sm font-semibold">Valores de Exemplo</h3>
                              <p className="text-muted-foreground text-xs">
                                Obrigatório pela Meta para validar seu template
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {variables.length} {variables.length === 1 ? 'campo' : 'campos'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            {variables.map((v, index) => (
                              <Controller
                                key={v}
                                control={form.control}
                                name={`samples.${v}` as any}
                                render={({ field, fieldState }) => (
                                  <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel
                                      htmlFor={field.name}
                                      className="text-xs font-medium"
                                    >
                                      Variável{' '}
                                      <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                                        {v}
                                      </code>
                                    </FieldLabel>
                                    <Input
                                      id={field.name}
                                      placeholder={
                                        index === 0
                                          ? 'ex: Maria Silva'
                                          : index === 1
                                            ? 'ex: #12345'
                                            : 'ex: amanhã'
                                      }
                                      className="text-sm"
                                      {...field}
                                    />
                                    <FieldError errors={[fieldState.error]} />
                                  </Field>
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </form>
                </Form>
              </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="bg-muted/30 border-t px-8 py-4">
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => onOpenChange(false)} type="button">
                  Cancelar
                </Button>
                <Button
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={mutation.isPending}
                  className="gap-2"
                >
                  {mutation.isPending ? (
                    <>Enviando...</>
                  ) : mode === 'create' ? (
                    <>Criar Template</>
                  ) : (
                    <>Atualizar Template</>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="bg-muted/50 hidden lg:block">
            <TemplatePreview bodyText={bodyText || ''} samples={samples} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
