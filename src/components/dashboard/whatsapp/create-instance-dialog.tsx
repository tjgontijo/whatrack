'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ORGANIZATION_HEADER } from '@/lib/constants'
import { authClient } from '@/lib/auth/auth-client'
import { applyWhatsAppMask, normalizeWhatsApp } from '@/lib/mask/phone-mask'

type CreateInstanceDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreated: () => void
}

export function CreateInstanceDialog({
    open,
    onOpenChange,
    onCreated,
}: CreateInstanceDialogProps) {
    const { data: activeOrg } = authClient.useActiveOrganization()
    const organizationId = activeOrg?.id

    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!organizationId) {
            toast.error('Organização não encontrada')
            return
        }

        if (!name.trim()) {
            toast.error('Preencha o nome da instância')
            return
        }

        if (!phone.trim()) {
            toast.error('Preencha o número do telefone')
            return
        }

        setIsSubmitting(true)

        try {
            const response = await fetch('/api/v1/whatsapp/w/instances', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [ORGANIZATION_HEADER]: organizationId,
                },
                body: JSON.stringify({
                    name: name.trim(),
                    phone: normalizeWhatsApp(phone),
                }),
            })

            if (!response.ok) {
                const err = await response.json().catch(() => undefined)
                throw new Error(err?.error ?? 'Falha ao criar instância')
            }

            toast.success('Instância criada com sucesso!')
            setName('')
            setPhone('')
            onOpenChange(false)
            onCreated()
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nova Instância WhatsApp</DialogTitle>
                    <DialogDescription>
                        Informe os dados para criar uma nova instância.
                    </DialogDescription>
                </DialogHeader>

                <form className="space-y-4 mt-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="instance-name">
                            Nome da Instância
                        </label>
                        <Input
                            id="instance-name"
                            placeholder="Ex: Atendimento Principal"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            disabled={isSubmitting}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="instance-phone">
                            Número do WhatsApp
                        </label>
                        <Input
                            id="instance-phone"
                            placeholder="(11) 99999-9999"
                            value={phone}
                            onChange={(e) => setPhone(applyWhatsAppMask(e.target.value))}
                            required
                            disabled={isSubmitting}
                            maxLength={15}
                        />
                        <p className="text-xs text-muted-foreground">
                            Digite apenas DDD + Número
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={!name.trim() || !phone.trim() || isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                'Criar Instância'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}