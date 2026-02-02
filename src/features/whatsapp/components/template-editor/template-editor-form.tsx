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
    SelectValue
} from '@/components/ui/select'
import { whatsappApi } from '../../api/whatsapp'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Info, HelpCircle, Layout } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TemplatePreview } from './template-preview'
import type { WhatsAppTemplate } from '../../types'

const templateSchema = z.object({
    name: z.string()
        .min(1, 'O nome é obrigatório')
        .max(512, 'Máximo 512 caracteres')
        .regex(/^[a-z0-9_]+$/, 'Use apenas letras minúsculas, números e underscores'),
    category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']),
    language: z.string().min(2, 'Idioma é obrigatório'),
    headerText: z.string().max(60, 'Máximo 60 caracteres').optional(),
    bodyText: z.string().min(1, 'O corpo da mensagem é obrigatório').max(1024, 'Limite de 1024 caracteres'),
    footerText: z.string().max(60, 'Máximo 60 caracteres').optional(),
    samples: z.record(z.string(), z.string().min(1, 'Amostra obrigatória')).optional(),
})

type TemplateFormValues = z.infer<typeof templateSchema>

interface TemplateEditorFormProps {
    template?: WhatsAppTemplate | null
    onClose: () => void
}

export function TemplateEditorForm({ template, onClose }: TemplateEditorFormProps) {
    const queryClient = useQueryClient()
    const [variables, setVariables] = useState<string[]>([])
    const mode = template ? 'edit' : 'create'

    const form = useForm<TemplateFormValues>({
        resolver: zodResolver(templateSchema),
        defaultValues: {
            name: '',
            category: 'MARKETING',
            language: 'pt_BR',
            headerText: '',
            bodyText: '',
            footerText: '',
            samples: {},
        },
    })

    const name = form.watch('name')
    const headerText = form.watch('headerText')
    const bodyText = form.watch('bodyText')
    const footerText = form.watch('footerText')
    const samples = form.watch('samples') || {}

    useEffect(() => {
        if (mode === 'edit' && template) {
            const headerComponent = template.components?.find((c: any) => c.type.toUpperCase() === 'HEADER')
            const bodyComponent = template.components?.find((c: any) => c.type.toUpperCase() === 'BODY')
            const footerComponent = template.components?.find((c: any) => c.type.toUpperCase() === 'FOOTER')

            form.reset({
                name: template.name,
                category: template.category as any,
                language: template.language,
                headerText: headerComponent?.text || '',
                bodyText: bodyComponent?.text || '',
                footerText: footerComponent?.text || '',
                samples: {},
            })
        }
    }, [mode, template, form])

    useEffect(() => {
        const matches = bodyText?.match(/\{\{(\d+)\}\}/g) || []
        const uniqueMatches = Array.from(new Set(matches)).sort((a, b) => {
            const numA = parseInt(a.replace(/\{\{|\}\}/g, ''))
            const numB = parseInt(b.replace(/\{\{|\}\}/g, ''))
            return numA - numB
        })
        setVariables(uniqueMatches)
    }, [bodyText])

    const mutation = useMutation({
        mutationFn: (values: TemplateFormValues) => {
            const components: any[] = []

            if (values.headerText && values.headerText.trim() !== '') {
                components.push({ type: 'header', format: 'text', text: values.headerText })
            }

            const bodyComp: any = { type: 'body', text: values.bodyText }
            if (variables.length > 0) {
                const sampleValues = variables.map(v => values.samples?.[v] || 'exemplo')
                bodyComp.example = { body_text: [sampleValues] }
            }
            components.push(bodyComp)

            if (values.footerText && values.footerText.trim() !== '') {
                components.push({ type: 'footer', text: values.footerText })
            }

            const payload = {
                name: values.name,
                category: values.category.toLowerCase(),
                language: values.language,
                components,
                parameter_format: 'positional',
            }
            return whatsappApi.createTemplate(payload)
        },
        onSuccess: () => {
            toast.success(mode === 'create' ? 'Template enviado para análise!' : 'Template atualizado!')
            queryClient.invalidateQueries({ queryKey: ['whatsapp', 'templates'] })
            onClose()
        },
        onError: (error: any) => {
            console.error('[TemplateForm] Erro:', error)
            toast.error(`Erro: ${error.message}`)
        }
    })

    function onSubmit(values: TemplateFormValues) {
        mutation.mutate(values)
    }

    return (
        <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-background">
            {/* Form Area */}
            <div className="flex-1 overflow-y-auto p-8 border-r scrollbar-thin scrollbar-thumb-muted">
                <div className="max-w-2xl mx-auto">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                            {/* SECTION 1: Nome e idioma */}
                            <section className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Controller
                                        control={form.control}
                                        name="name"
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid} className="md:col-span-2 space-y-1.5">
                                                <FieldLabel className="text-sm font-bold">Nome do modelo de mensagem</FieldLabel>
                                                <Input
                                                    placeholder="ex: boas_vindas_vendas"
                                                    className="h-11 font-medium bg-muted/30 border-muted-foreground/20 focus:bg-background transition-all rounded-xl"
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
                                                                <HelpCircle className="h-4 w-4 text-muted-foreground/60 cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent side="right" className="max-w-[300px] p-4 bg-popover border-border shadow-xl rounded-2xl">
                                                                <div className="space-y-3">
                                                                    <div><p className="font-bold text-xs uppercase mb-1">Marketing</p><p className="text-[11px] text-muted-foreground">Promoções e anúncios.</p></div>
                                                                    <div><p className="font-bold text-xs uppercase mb-1">Utilidade</p><p className="text-[11px] text-muted-foreground">Informa sobre transações e pedidos.</p></div>
                                                                    <div><p className="font-bold text-xs uppercase mb-1">Autenticação</p><p className="text-[11px] text-muted-foreground">Códigos de segurança (OTP).</p></div>
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger className="h-11 bg-muted/30 border-muted-foreground/20 rounded-xl">
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
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger className="h-11 bg-muted/30 border-muted-foreground/20 rounded-xl">
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
                                            <div className="flex justify-between items-center">
                                                <FieldLabel className="text-xs font-bold uppercase text-muted-foreground">Cabeçalho (Opcional)</FieldLabel>
                                                <span className="text-[10px] tabular-nums text-muted-foreground">{field.value?.length || 0}/60</span>
                                            </div>
                                            <Input
                                                placeholder="Título da mensagem"
                                                className="h-11 bg-muted/30 border-muted-foreground/20 rounded-xl"
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
                                                <FieldLabel className="text-xs font-bold uppercase text-muted-foreground">Corpo da Mensagem</FieldLabel>
                                                <span className="text-[10px] font-bold tabular-nums text-muted-foreground">{field.value?.length || 0} / 1024</span>
                                            </div>
                                            <Textarea
                                                placeholder="Digite o conteúdo. Use {{1}}, {{2}} para variáveis."
                                                className="min-h-[140px] text-base p-4 bg-muted/30 border-muted-foreground/20 rounded-2xl resize-none"
                                                {...field}
                                            />
                                            <div className="flex items-center gap-1.5 px-0.5 pt-0.5">
                                                <Info className="h-3 w-3 text-primary/60" />
                                                <p className="text-[10px] text-muted-foreground font-medium">As variáveis {"{{1}}, {{2}}"}, etc. serão substituídas por dados reais.</p>
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
                                            <div className="flex justify-between items-center">
                                                <FieldLabel className="text-xs font-bold uppercase text-muted-foreground">Rodapé (Opcional)</FieldLabel>
                                                <span className="text-[10px] tabular-nums text-muted-foreground">{field.value?.length || 0}/60</span>
                                            </div>
                                            <Input
                                                placeholder="Legenda no final da mensagem"
                                                className="h-11 bg-muted/30 border-muted-foreground/20 rounded-xl"
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
                                        <h3 className="text-sm font-bold uppercase text-muted-foreground">Amostras de Variáveis</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {variables.map((v) => {
                                            const varNumber = v.replace(/\{\{|\}\}/g, '')
                                            return (
                                                <Controller
                                                    key={v}
                                                    control={form.control}
                                                    name={`samples.${varNumber}` as any}
                                                    render={({ field, fieldState }) => (
                                                        <Field data-invalid={fieldState.invalid} className="space-y-1.5">
                                                            <FieldLabel className="text-[10px] font-bold text-muted-foreground">Valor para {v}</FieldLabel>
                                                            <Input
                                                                placeholder="Exemplo de conteúdo"
                                                                className="h-10 text-sm bg-muted/10 border-muted-foreground/10 rounded-xl"
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
                                    className="px-8 font-bold h-11 bg-primary"
                                    disabled={mutation.isPending}
                                >
                                    {mutation.isPending ? 'Enviando...' : 'Enviar para análise'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="lg"
                                    className="h-11 px-6 text-muted-foreground"
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
            <div className="hidden lg:flex w-[440px] bg-muted/5 flex-col items-center border-l h-full overflow-hidden">
                <div className="w-full flex-1 flex flex-col p-8 space-y-6 overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-muted pb-4 w-full">
                        <Layout className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Prévia no WhatsApp</h4>
                    </div>

                    <div className="relative mx-auto w-full max-w-[300px] h-[600px] rounded-[3rem] border-[10px] border-slate-900 bg-slate-900 shadow-2xl overflow-hidden ring-1 ring-white/10">
                        <div className="h-full bg-[#0b141a] relative overflow-hidden">
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
