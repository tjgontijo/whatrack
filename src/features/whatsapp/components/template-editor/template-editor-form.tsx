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
import { Info, HelpCircle, Layout, Type, FileText, AlignLeft, ChevronRight } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TemplatePreview } from './template-preview'
import type { WhatsAppTemplate } from '../../types'

const templateSchema = z.object({
    name: z.string()
        .min(1, 'É necessário inserir um nome para seu modelo.')
        .max(512, 'Nome muito longo')
        .regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e underscores'),
    category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']),
    language: z.string().min(2, 'Idioma é obrigatório'),
    headerType: z.enum(['NONE', 'TEXT']),
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
            language: 'en_US',
            headerType: 'NONE',
            headerText: '',
            bodyText: '',
            footerText: '',
            samples: {},
        },
    })

    const name = form.watch('name')
    const language = form.watch('language')
    const category = form.watch('category')
    const headerType = form.watch('headerType')
    const headerText = form.watch('headerText')
    const bodyText = form.watch('bodyText')
    const footerText = form.watch('footerText')
    const samples = form.watch('samples') || {}

    // Load initial data if editing
    useEffect(() => {
        if (mode === 'edit' && template) {
            const headerComponent = template.components?.find((c: any) => c.type === 'HEADER')
            const bodyComponent = template.components?.find((c: any) => c.type === 'BODY')
            const footerComponent = template.components?.find((c: any) => c.type === 'FOOTER')

            form.reset({
                name: template.name,
                category: template.category as any,
                language: template.language,
                headerType: headerComponent ? 'TEXT' : 'NONE',
                headerText: headerComponent?.text || '',
                bodyText: bodyComponent?.text || '',
                footerText: footerComponent?.text || '',
                samples: {},
            })
        }
    }, [mode, template, form])

    // Update variables list when body text changes
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

            if (values.headerType === 'TEXT' && values.headerText) {
                components.push({ type: 'HEADER', format: 'TEXT', text: values.headerText })
            }

            const bodyComp: any = { type: 'BODY', text: values.bodyText }
            if (variables.length > 0) {
                const sampleValues = variables.map(v => values.samples?.[v] || 'exemplo')
                bodyComp.example = { body_text: [sampleValues] }
            }
            components.push(bodyComp)

            if (values.footerText) {
                components.push({ type: 'FOOTER', text: values.footerText })
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
            <div className="flex-1 overflow-y-auto border-r scrollbar-thin scrollbar-thumb-muted">
                {/* Meta Style Sticky Header */}
                <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-8 py-5 flex items-center justify-between shadow-sm">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                {mode === 'create' ? 'Configurar modelo' : 'Editar modelo'}
                            </span>
                            <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                                {category}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            {name || 'Novo modelo'}
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px] font-bold h-5 px-2 bg-muted/50 border-transparent">
                                    {language}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">• Padrão</span>
                            </div>
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={onClose} disabled={mutation.isPending} className="font-semibold px-4">
                            Cancelar
                        </Button>
                        <Button size="sm" onClick={form.handleSubmit(onSubmit)} disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-white font-bold px-6 shadow-md shadow-primary/20">
                            {mutation.isPending ? 'Enviando...' : 'Enviar para análise'}
                        </Button>
                    </div>
                </div>

                <div className="p-8 pb-32 space-y-12 max-w-4xl mx-auto">
                    <Form {...form}>
                        <form className="space-y-16">

                            {/* SECTION 1: Nome e idioma */}
                            <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-foreground">Nome e idioma do modelo</h3>
                                    <p className="text-sm text-muted-foreground">Identifique seu modelo para uso na API.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Controller
                                        control={form.control}
                                        name="name"
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid} className="md:col-span-2 space-y-3">
                                                <div className="space-y-1">
                                                    <FieldLabel className="text-sm font-bold text-foreground">Dê um nome ao seu modelo</FieldLabel>
                                                    <p className="text-[12px] text-muted-foreground">Nome do modelo de mensagem</p>
                                                </div>
                                                <Input
                                                    placeholder="insira_um_nome_para_o_modelo"
                                                    className="h-11 font-medium bg-muted/20 border-transparent focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all rounded-xl"
                                                    {...field}
                                                    value={field.value ?? ''}
                                                    disabled={mode === 'edit'}
                                                />
                                                <div className="flex justify-between items-center px-1">
                                                    <p className="text-[11px] text-muted-foreground">Identificador exclusivo. Use apenas letras minúsculas, números e underscores.</p>
                                                    <span className={cn(
                                                        "text-[10px] font-bold tabular-nums",
                                                        field.value?.length > 512 ? "text-destructive" : "text-muted-foreground"
                                                    )}>
                                                        {field.value?.length || 0}/512
                                                    </span>
                                                </div>
                                                <FieldError errors={[fieldState.error]} />
                                            </Field>
                                        )}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:col-span-2">
                                        <Controller
                                            control={form.control}
                                            name="category"
                                            render={({ field, fieldState }) => (
                                                <Field data-invalid={fieldState.invalid} className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <FieldLabel className="text-sm font-bold text-foreground">Categoria</FieldLabel>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <HelpCircle className="h-4 w-4 text-muted-foreground/60 cursor-help" />
                                                                </TooltipTrigger>
                                                                <TooltipContent side="right" className="max-w-[320px] p-4 bg-popover border-border shadow-2xl rounded-2xl">
                                                                    <div className="space-y-4">
                                                                        <div className="space-y-1">
                                                                            <p className="font-bold text-primary text-xs uppercase tracking-widest">Marketing</p>
                                                                            <p className="text-[11px] leading-relaxed text-muted-foreground">Incluem ofertas promocionais, anúncios e convites para reengajamento.</p>
                                                                        </div>
                                                                        <div className="h-px bg-border/40" />
                                                                        <div className="space-y-1">
                                                                            <p className="font-bold text-primary text-xs uppercase tracking-widest">Utilidade</p>
                                                                            <p className="text-[11px] leading-relaxed text-muted-foreground">Mensagens sobre uma transação específica iniciada pelo cliente.</p>
                                                                        </div>
                                                                        <div className="h-px bg-border/40" />
                                                                        <div className="space-y-1">
                                                                            <p className="font-bold text-primary text-xs uppercase tracking-widest">Autenticação</p>
                                                                            <p className="text-[11px] leading-relaxed text-muted-foreground">Códigos de segurança (OTP) e verificação de identidade.</p>
                                                                        </div>
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="h-11 bg-muted/20 border-transparent rounded-xl focus:ring-4 focus:ring-primary/5 transition-all">
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
                                                <Field data-invalid={fieldState.invalid} className="space-y-3">
                                                    <FieldLabel className="text-sm font-bold text-foreground">Selecione o idioma</FieldLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="h-11 bg-muted/20 border-transparent rounded-xl focus:ring-4 focus:ring-primary/5 transition-all">
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
                                </div>
                            </section>

                            <Separator className="opacity-50" />

                            {/* SECTION 2: Conteúdo */}
                            <section className="space-y-10">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-foreground">Conteúdo</h3>
                                    <p className="text-sm text-muted-foreground max-w-xl">
                                        Adicione um cabeçalho, corpo de texto e rodapé para o seu modelo. A Meta analisará o conteúdo para garantir a segurança dos serviços.
                                    </p>
                                </div>

                                <div className="space-y-10">
                                    {/* Header Type Select */}
                                    <Controller
                                        control={form.control}
                                        name="headerType"
                                        render={({ field }) => (
                                            <Field className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <FieldLabel className="text-sm font-bold text-foreground">Tipo de cabeçalho</FieldLabel>
                                                    <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground/60">Opcional</Badge>
                                                </div>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger className="h-11 bg-muted/20 border-transparent rounded-xl max-w-[200px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="NONE">Nenhum</SelectItem>
                                                        <SelectItem value="TEXT">Texto</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </Field>
                                        )}
                                    />

                                    {/* Header Text Input (Conditional) */}
                                    {headerType === 'TEXT' && (
                                        <Controller
                                            control={form.control}
                                            name="headerText"
                                            render={({ field, fieldState }) => (
                                                <Field data-invalid={fieldState.invalid} className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                                    <FieldLabel className="text-sm font-bold text-foreground">Texto do cabeçalho</FieldLabel>
                                                    <Input
                                                        placeholder="Ex: Confirmação de pedido"
                                                        className="h-11 bg-muted/10 border-muted focus:ring-4 focus:ring-primary/5 transition-all rounded-xl"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                    />
                                                    <div className="flex justify-end mt-1 px-1">
                                                        <span className="text-[10px] text-muted-foreground tabular-nums font-medium">{field.value?.length || 0}/60</span>
                                                    </div>
                                                    <FieldError errors={[fieldState.error]} />
                                                </Field>
                                            )}
                                        />
                                    )}

                                    {/* Body Text Input (Required) */}
                                    <Controller
                                        control={form.control}
                                        name="bodyText"
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid} className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <FieldLabel className="text-sm font-bold text-foreground">Corpo</FieldLabel>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const current = form.getValues('bodyText')
                                                                const nextNum = variables.length + 1
                                                                form.setValue('bodyText', current + `{{${nextNum}}}`)
                                                            }}
                                                            className="text-[10px] font-bold text-primary hover:bg-primary/5 px-2 py-1 rounded transition-colors"
                                                        >
                                                            + Adicionar variável
                                                        </button>
                                                    </div>
                                                </div>
                                                <Textarea
                                                    placeholder="Insira o texto em seu idioma. Use {{1}} para criar marcadores de variáveis..."
                                                    className="min-h-[200px] text-[15px] leading-relaxed p-5 bg-muted/20 border-transparent rounded-2xl resize-none focus:ring-4 focus:ring-primary/5 transition-all"
                                                    {...field}
                                                />
                                                <div className="flex items-center justify-between mt-2 px-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <Info className="h-3 w-3 text-primary/60" />
                                                        <p className="text-[11px] text-muted-foreground font-medium italic">As variáveis {{ 1}}, {{ 2}}, etc. serão substituídas por dados reais.</p>
                                                    </div>
                                                    <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
                                                        {field.value?.length || 0} / 1024
                                                    </span>
                                                </div>
                                                <FieldError errors={[fieldState.error]} />
                                            </Field>
                                        )}
                                    />

                                    {/* Footer Text Input (Optional) */}
                                    <Controller
                                        control={form.control}
                                        name="footerText"
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid} className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <FieldLabel className="text-sm font-bold text-foreground">Rodapé</FieldLabel>
                                                    <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground/60">Opcional</Badge>
                                                </div>
                                                <Input
                                                    placeholder="Rodapé do modelo de mensagem"
                                                    className="h-11 bg-muted/10 border-muted focus:ring-4 focus:ring-primary/5 transition-all rounded-xl"
                                                    {...field}
                                                    value={field.value ?? ''}
                                                />
                                                <div className="flex justify-end mt-1 px-1">
                                                    <span className="text-[10px] text-muted-foreground tabular-nums font-medium">{field.value?.length || 0}/60</span>
                                                </div>
                                                <FieldError errors={[fieldState.error]} />
                                            </Field>
                                        )}
                                    />

                                    {/* Buttons Placeholder (Matching Meta UI) */}
                                    <div className="p-6 rounded-2xl border border-dashed bg-muted/5 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <FieldLabel className="text-sm font-bold opacity-50 uppercase tracking-widest">Botões</FieldLabel>
                                            <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground/40">Em breve</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground/60 italic">Crie botões que permitam que os clientes respondam à sua mensagem ou realizem uma ação.</p>
                                    </div>
                                </div>
                            </section>

                            <Separator className="opacity-50" />

                            {/* SECTION 3: Amostras */}
                            {variables.length > 0 && (
                                <section className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                            Amostra de variáveis
                                            <Badge className="bg-primary/10 text-primary border-transparent text-[10px] uppercase">{variables.length} variáveis</Badge>
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Para análise da Meta, forneça exemplos reais do que será enviado nessas variáveis.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 rounded-3xl border bg-muted/5 border-muted transition-all">
                                        {variables.map((v) => {
                                            const varNumber = v.replace(/\{\{|\}\}/g, '')
                                            return (
                                                <Controller
                                                    key={v}
                                                    control={form.control}
                                                    name={`samples.${varNumber}` as any}
                                                    render={({ field, fieldState }) => (
                                                        <Field data-invalid={fieldState.invalid} className="space-y-2">
                                                            <FieldLabel className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Exemplo para {v}</FieldLabel>
                                                            <Input
                                                                placeholder="Conteúdo que o cliente verá"
                                                                className="h-10 text-sm bg-background border-muted rounded-xl focus:ring-4 focus:ring-primary/5 transition-all"
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
                        </form>
                    </Form>
                </div>
            </div>

            {/* Meta Style Preview Area */}
            <div className="hidden lg:flex w-[480px] bg-muted/10 flex-col items-center border-l h-full overflow-hidden bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:20px_20px]">
                <div className="w-full flex-1 flex flex-col p-8 space-y-10 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-muted pb-4 w-full">
                        <div className="flex items-center gap-2">
                            <Layout className="h-5 w-5 text-primary" />
                            <h4 className="text-[13px] font-bold uppercase tracking-widest text-foreground">Prévia do modelo</h4>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">WhatsApp Mockup</Badge>
                    </div>

                    <div className="relative mx-auto w-full max-w-[340px] h-[680px] rounded-[3.5rem] border-[14px] border-slate-900 bg-slate-900 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden transition-transform duration-500 hover:scale-[1.01]">
                        {/* Dynamic Island Placeholder */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-slate-900 rounded-b-3xl z-50 flex items-center justify-center">
                            <div className="w-12 h-1 rounded-full bg-slate-800/50"></div>
                        </div>

                        <div className="h-full bg-[#0b141a] relative overflow-hidden">
                            <TemplatePreview
                                templateName={name}
                                headerText={headerType === 'TEXT' ? headerText : ''}
                                bodyText={bodyText}
                                footerText={footerText}
                                samples={samples}
                            />
                        </div>
                    </div>

                    <div className="bg-popover/80 backdrop-blur p-4 rounded-2xl border border-muted shadow-sm mt-auto">
                        <div className="flex gap-3">
                            <Info className="h-5 w-5 text-primary shrink-0" />
                            <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                                Esta simulação reflete a renderização da Meta. Certifique-se de que as amostras de variáveis sejam precisas para agilizar a aprovação.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
