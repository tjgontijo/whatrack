'use client'

import { ExternalLink, Loader2, AlertCircle, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useWhatsAppOnboardingSDK } from '@/hooks/whatsapp/use-whatsapp-onboarding-sdk'

interface EmbeddedSignupButtonSDKProps {
  onSuccess?: () => void
}

export function EmbeddedSignupButtonSDK({ onSuccess }: EmbeddedSignupButtonSDKProps) {
  const { status, error, fbSdkReady, fbSdkError, startOnboarding } = useWhatsAppOnboardingSDK(onSuccess)

  const isConnecting = status === 'pending'
  const isDisabled = !fbSdkReady || isConnecting

  return (
    <Card className="mx-auto max-w-2xl border-green-200 bg-green-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
            <QrCode className="h-6 w-6 text-green-600" />
          </div>
          Conectar WhatsApp (QR Code via SDK)
        </CardTitle>
        <CardDescription>
          Novo método: importa apenas o número escaneado no QR Code (sem importações em massa)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(error || fbSdkError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || fbSdkError}</AlertDescription>
          </Alert>
        )}

        <div className="text-muted-foreground space-y-2 text-sm">
          <p>Este é o novo fluxo de Embedded Signup da Meta:</p>
          <ul className="ml-2 list-inside list-disc space-y-1">
            <li>Popup modal da Meta (sem sair da página)</li>
            <li>Leia o QR Code para o número específico</li>
            <li>Importação precisa (sem números indesejados)</li>
            <li>Suporte a coexistência com outros números</li>
          </ul>
        </div>

        <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800 border border-blue-200">
          <strong>Beta:</strong> Este fluxo está em testes paralelos. Se encontrar problemas, use o
          método clássico de redirecionamento.
        </div>

        <Button
          onClick={startOnboarding}
          className="w-full gap-2"
          size="lg"
          disabled={isDisabled}
          variant="default"
        >
          {!fbSdkReady ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando SDK...
            </>
          ) : isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Aguardando...
            </>
          ) : (
            <>
              <QrCode className="h-4 w-4" />
              Abrir Popup da Meta
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
