'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { FormProvider as Form, Controller } from 'react-hook-form'
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
import { Info, Sparkles, Eye, EyeOff, LayoutPanelLeft, MousePointer2 } from 'lucide-react'
import { TemplatePreview } from './template-preview'
import type { WhatsAppTemplate } from '../../types'
import { cn } from '@/lib/utils'

const templateSchema = z.object({
    name: z.string()
        .min(1, 'Nome é obrigatório')
        .max(512, 'Nome muito longo')
        .regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e underscores'),
    category: z.enum(['MARKETING', 'UTILITY']),
    language: z.string().min(2, 'Idioma é obrigatório'),
    bodyText: z.string().min(1, 'O corpo da mensagem é obrigatório').max(1024, 'Limite de 1024 caracteres'),
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
            category: 'UTILITY',
            language: 'pt_BR',
            bodyText: '',
            samples: {},
        },
    })

    const bodyText = form.watch('bodyText')
    const samples = form.watch('samples') || {}

    useEffect(() => {
        if (mode === 'edit' && template) {
            const bodyComponent = template.components?.find((c: any) => c.type === 'BODY')
            form.reset({
                name: template.name,
                category: template.category as 'MARKETING' | 'UTILITY',
                language: template.language,
                bodyText: bodyComponent?.text || '',
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
            const components: any[] = [{ type: 'BODY', text: values.bodyText }]
            if (variables.length > 0) {
                const sampleValues = variables.map(v => values.samples?.[v] || 'exemplo')
                components[0].example = { body_text: [sampleValues] }
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
            toast.success(mode === 'create' ? 'Template enviado para aprovação!' : 'Template atualizado!')
            queryClient.invalidateQueries({ queryKey: ['whatsapp', 'templates'] })
            onClose()
        },
        onError: (error: any) => toast.error(`Erro: ${error.message}`)
    })

    function onSubmit(values: TemplateFormValues) {
        mutation.mutate(values)
    }

    return (
        <div className="flex flex-col lg:flex-row h-full min-h-[600px]">
            {/* Left Side: Form Area */}
            <div className="flex-1 p-8 lg:p-12 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-12 pb-20">
                    {/* Stepper/Progress Indicator (Visual only) */}
                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
                        <span className="text-primary">01 Detalhes</span>
                        <Separator className="w-8" />
                        <span>02 Conteúdo</span>
                        <Separator className="w-8" />
                        <span>03 Aprovação</span>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
                            {/* Section 1: Identity */}
                            <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold tracking-tight">Identidade do Template</h3>
                                    <p className="text-sm text-muted-foreground">Defina como o WhatsApp identificará esta mensagem.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                    <Controller
                                        control={form.control}
                                        name="name"
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid} className="md:col-span-2">
                                                <FieldLabel htmlFor={field.name} className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                    <MousePointer2 className="h-3 w-3 text-primary" /> Nome Único
                                                </FieldLabel>
                                                <Input
                                                    id={field.name}
                                                    placeholder="ex: boas_vindas_cliente"
                                                    className="h-14 text-lg font-medium bg-muted/30 border-none shadow-inner focus-visible:ring-primary/20"
                                                    {...field}
                                                    disabled={mode === 'edit'}
                                                />
                                                <p className="text-sm text-muted-foreground">Apenas letras minúsculas, números e sublinhados.</p>
                                                <FieldError errors={[fieldState.error]} />
                                            </Field>
                                        )}
                                    />

                                    <Controller
                                        control={form.control}
                                        name="category"
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel htmlFor={field.name} className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Categoria</FieldLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger id={field.name} className="h-14 bg-muted/30 border-none shadow-inner">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="UTILITY" className="py-3">
                                                            <div className="font-semibold">Utilidade</div>
                                                            <div className="text-xs text-muted-foreground">Confirmações e alertas</div>
                                                        </SelectItem>
                                                        <SelectItem value="MARKETING" className="py-3">
                                                            <div className="font-semibold">Marketing</div>
                                                            <div className="text-xs text-muted-foreground">Promoções e ofertas</div>
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
                                                <FieldLabel htmlFor={field.name} className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Idioma Nativo</FieldLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger id={field.name} className="h-14 bg-muted/30 border-none shadow-inner">
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
                            </section>

                            <Separator className="opacity-50" />

                            {/* Section 2: Content */}
                            <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold tracking-tight">O que será dito</h3>
                                    <p className="text-sm text-muted-foreground">O coração do seu template. Use variáveis para personalizar.</p>
                                </div>

                                <Controller
                                    control={form.control}
                                    name="bodyText"
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor={field.name} className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                                <span>Texto da Mensagem</span>
                                                <span className={cn(
                                                    "text-[10px] tabular-nums px-2 py-0.5 rounded-full border",
                                                    field.value.length > 900 ? "text-orange-500 border-orange-200" : "text-muted-foreground border-transparent"
                                                )}>
                                                    {field.value.length}/1024
                                                </span>
                                            </FieldLabel>
                                            <Textarea
                                                id={field.name}
                                                placeholder="Olá {{1}}, seu pedido #{{2}} já saiu para entrega!"
                                                className="min-h-[200px] text-lg leading-relaxed bg-muted/30 border-none shadow-inner focus-visible:ring-primary/20 resize-none p-6"
                                                {...field}
                                            />
                                            <div className="flex gap-2 flex-wrap pt-2">
                                                <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px]">Sugestão: Use {"{{1}}"} para o nome</Badge>
                                                <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px]">Sugestão: Curto e direto converte mais</Badge>
                                            </div>
                                            <FieldError errors={[fieldState.error]} />
                                        </Field>
                                    )}
                                />
                            </section>

                            {/* Section 3: Samples (Dynamic) */}
                            {variables.length > 0 && (
                                <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 pt-4 bg-primary/[0.02] -mx-4 p-8 rounded-3xl border border-primary/10">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-bold tracking-tight">Personalizações</h3>
                                            <Badge className="bg-primary hover:bg-primary shadow-lg shadow-primary/20">{variables.length} Variáveis</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Exemplos reais ajudam na aprovação da Meta.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {variables.map((v, i) => (
                                            <Controller
                                                key={v}
                                                control={form.control}
                                                name={`samples.${v}` as any}
                                                render={({ field, fieldState }) => (
                                                    <Field data-invalid={fieldState.invalid}>
                                                        <FieldLabel htmlFor={field.name} className="text-[10px] font-black uppercase tracking-widest text-primary/60">Conteúdo do campo {v}</FieldLabel>
                                                        <Input
                                                            id={field.name}
                                                            placeholder={i === 0 ? "Maria Silva" : i === 1 ? "#9921" : "exemplo"}
                                                            className="h-12 bg-background border-primary/10 focus-visible:ring-primary/20"
                                                            {...field}
                                                        />
                                                        <FieldError errors={[fieldState.error]} />
                                                    </Field>
                                                )}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </form>
                    </Form>
                </div>
            </div>

            {/* Right Side: Premium Preview Panel */}
            <div className="w-full lg:w-[450px] bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col relative overflow-hidden group">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/5 blur-[100px] rounded-full -ml-32 -mb-32" />

                <div className="flex-1 flex flex-col p-8 lg:p-12 relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Live Preview</h4>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Simulação em Tempo Real</p>
                        </div>
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-full max-w-[320px] scale-110 md:scale-100 transition-transform duration-500 group-hover:scale-[1.02]">
                            {/* Glass Mockup */}
                            <div className="relative p-1 rounded-[40px] bg-gradient-to-br from-slate-200 to-slate-400 dark:from-slate-700 dark:to-slate-800 shadow-2xl">
                                <div className="rounded-[38px] bg-slate-100 dark:bg-slate-950 overflow-hidden border-[6px] border-slate-900 dark:border-slate-800 h-[560px] flex flex-col">
                                    <TemplatePreview
                                        bodyText={bodyText}
                                        samples={samples}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-12 flex flex-col gap-3">
                        <Button
                            size="lg"
                            className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 gap-3 group/btn"
                            disabled={mutation.isPending || !form.formState.isValid}
                            onClick={form.handleSubmit(onSubmit)}
                        >
                            <Sparkles className="h-5 w-5 animate-pulse" />
                            {mutation.isPending ? 'Propagando...' : 'Publicar Template'}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-slate-500 hover:text-slate-800 font-bold text-[10px] uppercase tracking-widest"
                            onClick={onClose}
                        >
                            Descartar Alterações
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
