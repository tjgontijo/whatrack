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
import { Info } from 'lucide-react'
import { TemplatePreview } from './template-preview'
import type { WhatsAppTemplate } from '../../types'

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
            <div className="flex-1 overflow-y-auto p-6 md:p-10 border-r">
                <div className="max-w-2xl mx-auto space-y-10">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">
                            {mode === 'create' ? 'Configurar Template' : 'Editar Template'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Preencha as informações básicas e o conteúdo da mensagem para enviar à Meta.
                        </p>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                            {/* Identificação */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Controller
                                    control={form.control}
                                    name="name"
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid} className="md:col-span-2">
                                            <FieldLabel htmlFor={field.name} className="flex items-center gap-2">
                                                Nome do Template
                                            </FieldLabel>
                                            <Input
                                                id={field.name}
                                                placeholder="ex: boas_vindas_vendas"
                                                className="h-11 font-medium"
                                                {...field}
                                                value={field.value ?? ''}
                                                disabled={mode === 'edit'}
                                            />
                                            <p className="text-[11px] text-muted-foreground">
                                                Identificador único. Use apenas letras minúsculas, números e underscores.
                                            </p>
                                            <FieldError errors={[fieldState.error]} />
                                        </Field>
                                    )}
                                />

                                <Controller
                                    control={form.control}
                                    name="category"
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor={field.name}>Categoria</FieldLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger id={field.name} className="h-11">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="UTILITY">Utilidade</SelectItem>
                                                    <SelectItem value="MARKETING">Marketing</SelectItem>
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
                                            <FieldLabel htmlFor={field.name}>Idioma</FieldLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger id={field.name} className="h-11">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pt_BR">Português (Brasil)</SelectItem>
                                                    <SelectItem value="en_US">Inglês (EUA)</SelectItem>
                                                    <SelectItem value="es">Espanhol</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FieldError errors={[fieldState.error]} />
                                        </Field>
                                    )}
                                />
                            </div>

                            <Separator />

                            {/* Conteúdo */}
                            <div className="space-y-6">
                                <Controller
                                    control={form.control}
                                    name="bodyText"
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <div className="flex items-center justify-between mb-2">
                                                <FieldLabel htmlFor={field.name} className="m-0 text-sm font-bold uppercase tracking-wider text-muted-foreground">Corpo da Mensagem</FieldLabel>
                                                <span className="text-[10px] text-muted-foreground tabular-nums">
                                                    {field.value.length}/1024
                                                </span>
                                            </div>
                                            <Textarea
                                                id={field.name}
                                                placeholder="Olá {{1}}, bem-vindo à nossa empresa! Seu pedido {{2}} foi confirmado."
                                                className="min-h-[160px] text-base leading-relaxed p-4 resize-none bg-muted/20 border-none shadow-inner"
                                                {...field}
                                            />
                                            <div className="flex gap-2 pt-2">
                                                <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                                                    Dica: Use {"{{1}}"}, {"{{2}}"} para variáveis
                                                </Badge>
                                            </div>
                                            <FieldError errors={[fieldState.error]} />
                                        </Field>
                                    )}
                                />

                                {/* Amostras de Variáveis */}
                                {variables.length > 0 && (
                                    <div className="p-6 rounded-2xl border bg-muted/10 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Info className="h-4 w-4 text-primary" />
                                            <h4 className="text-sm font-bold">Exemplos de Variáveis</h4>
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
                                                            <Field data-invalid={fieldState.invalid}>
                                                                <FieldLabel htmlFor={field.name} className="text-[10px] uppercase font-bold text-muted-foreground">Exemplo para {v}</FieldLabel>
                                                                <Input
                                                                    id={field.name}
                                                                    placeholder="Exemplo de dado"
                                                                    className="h-10 text-sm bg-background border-muted"
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
                                    </div>
                                )}
                            </div>

                            {/* Ações do Formulário */}
                            <div className="flex items-center gap-4 pt-6">
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="px-10 font-bold h-12"
                                    disabled={mutation.isPending}
                                >
                                    {mutation.isPending ? 'Enviando...' : (mode === 'create' ? 'Criar Template' : 'Salvar Alterações')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="lg"
                                    className="h-12"
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
            <div className="hidden lg:flex w-[400px] bg-muted/20 flex-col p-10 items-center border-l">
                <div className="w-full space-y-6">
                    <div className="space-y-1">
                        <h4 className="text-sm font-bold">Prévia no Telefone</h4>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Como o cliente verá a mensagem</p>
                    </div>

                    <div className="relative mx-auto w-full max-w-[300px]">
                        {/* Mockup do Celular */}
                        <div className="relative border-slate-900 bg-slate-900 border-[8px] rounded-[2.8rem] h-[580px] w-full shadow-2xl overflow-hidden">
                            <div className="rounded-[2.2rem] h-full bg-[#E5DDD5] relative border border-slate-700 overflow-hidden">
                                <TemplatePreview
                                    bodyText={bodyText}
                                    samples={samples}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
