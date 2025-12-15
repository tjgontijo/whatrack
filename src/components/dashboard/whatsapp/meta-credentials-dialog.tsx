'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ORGANIZATION_HEADER } from '@/lib/constants'
import { authClient } from '@/lib/auth/auth-client'
import type { MetaWhatsAppCredential } from '@/hooks/use-meta-cloud-status'

interface MetaCredentialsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingCredential?: MetaWhatsAppCredential | null
  onSaved: () => void
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

export function MetaCredentialsDialog({
  open,
  onOpenChange,
  existingCredential,
  onSaved,
}: MetaCredentialsDialogProps) {
  const { data: activeOrg } = authClient.useActiveOrganization()

  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [wabaId, setWabaId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')

  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [isSaving, setIsSaving] = useState(false)

  // Populate form with existing credentials
  useEffect(() => {
    if (existingCredential) {
      setPhoneNumberId(existingCredential.phoneNumberId)
      setWabaId(existingCredential.wabaId)
      setPhoneNumber(existingCredential.phoneNumber)
      // Don't populate access token for security
      setAccessToken('')
    } else {
      setPhoneNumberId('')
      setWabaId('')
      setAccessToken('')
      setPhoneNumber('')
    }
    setTestStatus('idle')
  }, [existingCredential, open])

  const handleTestConnection = async () => {
    if (!activeOrg?.id) {
      toast.error('Organização não encontrada')
      return
    }

    if (!phoneNumberId.trim() || !accessToken.trim()) {
      toast.error('Preencha Phone Number ID e Access Token')
      return
    }

    setTestStatus('testing')
    try {
      const response = await fetch('/api/v1/whatsapp/meta-cloud/credential/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ORGANIZATION_HEADER]: activeOrg.id,
        },
        body: JSON.stringify({
          phoneNumberId,
          accessToken,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Falha na conexão')
      }

      const data = await response.json()
      if (data.phoneNumber) {
        setPhoneNumber(data.phoneNumber)
      }

      setTestStatus('success')
      toast.success('Conexão testada com sucesso!')
    } catch (error) {
      setTestStatus('error')
      toast.error(error instanceof Error ? error.message : 'Erro ao testar conexão')
    }
  }

  const handleSave = async () => {
    if (!activeOrg?.id) {
      toast.error('Organização não encontrada')
      return
    }

    if (!phoneNumberId.trim() || !wabaId.trim()) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    // For new credentials, require access token
    if (!existingCredential && !accessToken.trim()) {
      toast.error('Access Token é obrigatório')
      return
    }

    setIsSaving(true)
    try {
      const payload: Record<string, string> = {
        phoneNumberId,
        wabaId,
        phoneNumber,
      }

      // Only send accessToken if it was changed
      if (accessToken.trim()) {
        payload.accessToken = accessToken
      }

      const response = await fetch('/api/v1/whatsapp/meta-cloud/credential', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ORGANIZATION_HEADER]: activeOrg.id,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Falha ao salvar credenciais')
      }

      toast.success('Credenciais salvas com sucesso!')
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar credenciais')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Credenciais WhatsApp Business API</DialogTitle>
          <DialogDescription>
            Para conectar sua conta do WhatsApp Business, você precisa fornecer as credenciais da Meta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium">Como obter essas informações?</p>
            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-primary hover:underline"
            >
              Acesse developers.facebook.com
              <ExternalLink className="h-3 w-3" />
            </a>
            <p className="mt-1 text-muted-foreground">
              WhatsApp → API Setup → copie os valores
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone-number-id">Phone Number ID *</Label>
            <Input
              id="phone-number-id"
              placeholder="123456789012345"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waba-id">WhatsApp Business Account ID *</Label>
            <Input
              id="waba-id"
              placeholder="987654321098765"
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="access-token">
              Access Token (permanente) {existingCredential ? '' : '*'}
            </Label>
            <Input
              id="access-token"
              type="password"
              placeholder={existingCredential ? 'Deixe em branco para manter o atual' : 'EAAG...'}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            {existingCredential && (
              <p className="text-xs text-muted-foreground">
                Deixe em branco para manter o token atual
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone-number">Número WhatsApp</Label>
            <Input
              id="phone-number"
              placeholder="+55 11 99999-9999"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={testStatus === 'success'}
            />
            <p className="text-xs text-muted-foreground">
              Será preenchido automaticamente após testar a conexão
            </p>
          </div>

          {/* Test status indicator */}
          {testStatus === 'success' && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Conexão verificada com sucesso
            </div>
          )}

          {testStatus === 'error' && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/50 dark:text-red-300">
              <XCircle className="h-4 w-4" />
              Falha na verificação. Verifique suas credenciais.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="secondary"
            onClick={handleTestConnection}
            disabled={testStatus === 'testing' || !phoneNumberId.trim() || !accessToken.trim()}
          >
            {testStatus === 'testing' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Testar Conexão
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || (!existingCredential && !accessToken.trim())}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
