'use client'

import { useState } from 'react'
import { Lock, Building2, CheckCircle2, ExternalLink, Settings } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMetaCloudStatus } from '@/hooks/use-meta-cloud-status'
import { MetaCredentialsDialog } from '@/components/dashboard/whatsapp/meta-credentials-dialog'
import { TestTemplateSection } from './test-template-section'

export function MetaCloudTab() {
  const { hasAddon, isConfigured, credential, isLoading, refetch } = useMetaCloudStatus()
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  // State 1: LOCKED - No add-on
  if (!hasAddon) {
    return <LockedState />
  }

  // State 2: UNLOCKED but NOT CONFIGURED
  if (!isConfigured) {
    return (
      <>
        <NotConfiguredState onConfigure={() => setShowCredentialsDialog(true)} />
        <MetaCredentialsDialog
          open={showCredentialsDialog}
          onOpenChange={setShowCredentialsDialog}
          onSaved={() => {
            setShowCredentialsDialog(false)
            refetch()
          }}
        />
      </>
    )
  }

  // State 3: UNLOCKED and CONFIGURED
  return (
    <>
      <ConfiguredState
        credential={credential!}
        onEditCredentials={() => setShowCredentialsDialog(true)}
      />
      <MetaCredentialsDialog
        open={showCredentialsDialog}
        onOpenChange={setShowCredentialsDialog}
        existingCredential={credential}
        onSaved={() => {
          setShowCredentialsDialog(false)
          refetch()
        }}
      />
    </>
  )
}

function LockedState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Card className="max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Integração Oficial da Meta</CardTitle>
          <CardDescription className="text-base">
            Conecte diretamente com a API oficial do WhatsApp Business para enviar mensagens em escala.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-3 text-left text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Sem necessidade de QR Code</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Conexão estável 24/7</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Templates de mensagem aprovados</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Alta entregabilidade</span>
            </li>
          </ul>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-lg font-semibold text-primary">+ R$ 97/mês</p>
            <p className="text-sm text-muted-foreground">Adicione ao seu plano atual</p>
          </div>

          <Button asChild className="w-full">
            <Link href="/dashboard/settings/billing?addon=meta_cloud">
              Contratar Add-on
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function NotConfiguredState({ onConfigure }: { onConfigure: () => void }) {
  return (
    <div className="flex items-center justify-center py-12">
      <Card className="max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Configure sua conta Business</CardTitle>
          <CardDescription className="text-base">
            Conecte sua conta do WhatsApp Business para enviar templates de mensagem via API oficial da Meta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={onConfigure} className="w-full">
            Configurar WhatsApp Business
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>

          <p className="text-sm text-muted-foreground">
            Precisa de ajuda?{' '}
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Veja o guia de configuração
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function ConfiguredState({
  credential,
  onEditCredentials,
}: {
  credential: NonNullable<ReturnType<typeof useMetaCloudStatus>['credential']>
  onEditCredentials: () => void
}) {
  return (
    <div className="space-y-6">
      {/* Account Info Card */}
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">WhatsApp Business</h3>
              <p className="text-sm text-muted-foreground font-mono">
                {formatPhone(credential.phoneNumber)}
              </p>
              <p className="text-xs text-muted-foreground">
                WABA: {credential.wabaId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/30">
              <CheckCircle2 className="h-3 w-3" />
              Configurado
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Test Template Section */}
      <TestTemplateSection />

      {/* Edit Credentials Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={onEditCredentials} className="gap-2">
          <Settings className="h-4 w-4" />
          Editar Credenciais
        </Button>
      </div>
    </div>
  )
}

function formatPhone(value?: string | null) {
  if (!value) return '—'
  const numbers = value.replace(/\D/g, '')
  if (numbers.length === 13 && numbers.startsWith('55')) {
    return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9)}`
  }
  if (numbers.length > 0) {
    return `+${numbers}`
  }
  return value
}
