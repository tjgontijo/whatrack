'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'
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
    SelectValue
} from '@/components/ui/select'
import { whatsappApi } from '../../api/whatsapp'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Separator } from '@/components/ui/separator'
import { Info, MessageSquare } from 'lucide-react'

const createTemplateSchema = z.object({
    name: z.string()
        .min(1, 'Nome é obrigatório')
        .max(512, 'Nome muito longo')
        .regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e underscores (snake_case)'),
    category: z.enum(['MARKETING', 'UTILITY']),
    language: z.string().min(2, 'Idioma é obrigatório'),
    bodyText: z.string().min(1, 'O corpo da mensagem é obrigatório').max(1024, 'Limite de 1024 caracteres'),
    samples: z.record(z.string(), z.string().min(1, 'Amostra obrigatória')).optional(),
})

type CreateTemplateFormValues = z.infer<typeof createTemplateSchema>

interface CreateTemplateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CreateTemplateDialog({ open, onOpenChange }: CreateTemplateDialogProps) {
    const queryClient = useQueryClient()
    const [variables, setVariables] = useState<string[]>([])

    const form = useForm<CreateTemplateFormValues>({
        resolver: zodResolver(createTemplateSchema),
        defaultValues: {
            name: '',
            category: 'MARKETING',
            language: 'pt_BR',
            bodyText: '',
            samples: {},
        },
    })

    const bodyText = form.watch('bodyText')

    // Detect variables in real-time
    useEffect(() => {
        const matches = bodyText.match(/\{\{(\d+)\}\}/g) || []
        const uniqueMatches = Array.from(new Set(matches)).sort((a, b) => {
            const numA = parseInt(a.replace(/\{\{|\}\}/g, ''))
            const numB = parseInt(b.replace(/\{\{|\}\}/g, ''))
            return numA - numB
        })
        setVariables(uniqueMatches)
    }, [bodyText])

    const mutation = useMutation({
        mutationFn: (values: CreateTemplateFormValues) => {
            // Transform form values to Meta API format
            const components: any[] = [
                {
                    type: 'BODY',
                    text: values.bodyText,
                }
            ]

            // Add samples if there are variables
            if (variables.length > 0) {
                const sampleValues = variables.map(v => values.samples?.[v] || 'exemplo')
                components[0].example = {
                    body_text: [sampleValues]
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
            toast.success('Template enviado para aprovação!')
            queryClient.invalidateQueries({ queryKey: ['whatsapp', 'templates'] })
            onOpenChange(false)
            form.reset()
        },
        onError: (error: any) => {
            toast.error(`Erro ao criar template: ${error.message}`)
        }
    })

    function onSubmit(values: CreateTemplateFormValues) {
        mutation.mutate(values)
    }

    // Get preview text by replacing placeholders with samples
    const getPreviewText = () => {
        let preview = bodyText || "Sua mensagem aparecerá aqui..."
        variables.forEach(v => {
            const sample = form.watch(`samples.${v}` as any) || v
            preview = preview.split(v).join(sample)
        })
        return preview
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Novo Template WhatsApp</DialogTitle>
                    <DialogDescription>
                        Crie um template para enviar aos seus clientes. Ele será revisado pela Meta.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <Controller
                                control={form.control}
                                name="name"
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor={field.name}>Nome do Template</FieldLabel>
                                        <Input id={field.name} placeholder="ex: confirmacao_compra" {...field} />
                                        <FieldDescription className="text-[10px]">
                                            Use minúsculas e underscores.
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
                                        <FieldLabel htmlFor={field.name}>Categoria</FieldLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger id={field.name}>
                                                <SelectValue placeholder="Selecione uma categoria" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MARKETING">Marketing</SelectItem>
                                                <SelectItem value="UTILITY">Utilidade</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FieldError errors={[fieldState.error]} />
                                    </Field>
                                )}
                            />
                        </div>

                        <Controller
                            control={form.control}
                            name="bodyText"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor={field.name}>Corpo da Mensagem</FieldLabel>
                                    <Textarea
                                        id={field.name}
                                        placeholder="Olá {{1}}, seu pedido {{2}} foi enviado!"
                                        className="min-h-[100px] resize-none"
                                        {...field}
                                    />
                                    <FieldDescription className="flex items-center gap-1.5 text-[10px]">
                                        <Info className="h-3 w-3" />
                                        Use {"{{1}}, {{2}}"} para adicionar variáveis dinâmicas.
                                    </FieldDescription>
                                    <FieldError errors={[fieldState.error]} />
                                </Field>
                            )}
                        />

                        {variables.length > 0 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <Separator />
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold">Exemplos das Variáveis</h4>
                                    <p className="text-[10px] text-muted-foreground">
                                        A Meta exige exemplos reais para aprovar o template.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {variables.map((v) => (
                                        <Controller
                                            key={v}
                                            control={form.control}
                                            name={`samples.${v}` as any}
                                            render={({ field, fieldState }) => (
                                                <Field data-invalid={fieldState.invalid}>
                                                    <FieldLabel htmlFor={field.name} className="text-xs">Exemplo para {v}</FieldLabel>
                                                    <Input id={field.name} placeholder="ex: Maria" {...field} />
                                                    <FieldError errors={[fieldState.error]} />
                                                </Field>
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Prévia da Mensagem
                            </h4>
                            <div className="bg-slate-50 dark:bg-slate-900 border rounded-xl p-4 text-sm font-sans relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                                <div className="whitespace-pre-wrap leading-relaxed">
                                    {getPreviewText()}
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-4 border-t">
                            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? 'Criando...' : 'Enviar para Aprovação'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
