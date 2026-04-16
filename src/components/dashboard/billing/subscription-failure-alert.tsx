'use client'

import { useCallback, useState } from 'react'
import { motion } from 'motion/react'
import { AlertCircle, AlertTriangle, Loader2, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { getPixFailureMessage } from '@/lib/billing/pix-failure.helper'

export type BillingFailureReason = 'EXPIRED' | 'DENIED' | 'CANCELED_BY_USER' | 'FAILED_DEBIT' | 'OTHER'

interface SubscriptionFailureAlertProps {
  failureReason: BillingFailureReason
  failureCount: number
  lastFailureAt?: string | null
  nextRetryAt?: string | null
  subscriptionId: string
  isRetrying?: boolean
}

const SEVERITY_LEVELS = {
  WARNING: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  DESTRUCTIVE: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
}

export function SubscriptionFailureAlert({
  failureReason,
  failureCount,
  lastFailureAt,
  nextRetryAt,
  subscriptionId,
  isRetrying = false,
}: SubscriptionFailureAlertProps) {
  const [isRetryLoading, setIsRetryLoading] = useState(false)

  // Escalate severity after 3+ failures
  const severity = failureCount >= 3 ? 'DESTRUCTIVE' : 'WARNING'
  const SeverityIcon = SEVERITY_LEVELS[severity].icon

  const failureMessage = getPixFailureMessage(failureReason)

  const handleRetry = useCallback(async () => {
    setIsRetryLoading(true)

    try {
      const response = await fetch('/api/v1/billing/subscription/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      toast.success('Tentativa de pagamento iniciada')
    } catch (error) {
      toast.error('Erro ao tentar novamente')
    } finally {
      setIsRetryLoading(false)
    }
  }, [subscriptionId])

  const handleContactSupport = () => {
    // Open WhatsApp support
    const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(
      `Olá, tenho um problema com minha cobrança. ID: ${subscriptionId}`,
    )}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Alert variant={severity === 'DESTRUCTIVE' ? 'destructive' : 'default'} className="border-2">
        <SeverityIcon className="h-5 w-5" />
        <AlertTitle className="text-base font-semibold">
          {severity === 'DESTRUCTIVE' ? 'Ação urgente necessária' : 'Problema no pagamento'}
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-4">
          {/* Main error message */}
          <p className="text-sm leading-relaxed">{failureMessage}</p>

          {/* Failure info */}
          <div className="rounded-md bg-slate-50 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Tentativas falhadas:</span>
              <span className="font-semibold text-slate-900">{failureCount}</span>
            </div>
            {lastFailureAt && (
              <div className="flex justify-between">
                <span className="text-slate-600">Última tentativa:</span>
                <span className="text-slate-700">{new Date(lastFailureAt).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
            {nextRetryAt && (
              <div className="flex justify-between">
                <span className="text-slate-600">Próxima tentativa:</span>
                <span className="font-semibold text-amber-700">
                  {new Date(nextRetryAt).toLocaleDateString('pt-BR')} às{' '}
                  {new Date(nextRetryAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Escalation message for critical failures */}
          {severity === 'DESTRUCTIVE' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-md bg-red-100 p-3 border-l-4 border-red-500"
            >
              <p className="text-xs font-semibold text-red-800">
                ⚠️ Após múltiplas falhas, sua assinatura pode ser cancelada automaticamente.
              </p>
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleRetry}
              disabled={isRetryLoading || isRetrying}
              variant={severity === 'DESTRUCTIVE' ? 'default' : 'secondary'}
            >
              {isRetryLoading || isRetrying ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Tentando...
                </>
              ) : (
                'Tentar Novamente'
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={handleContactSupport}>
              <Phone className="h-3 w-3 mr-1" />
              Suporte
            </Button>
          </div>

          {/* Next auto-cancel warning */}
          {failureCount >= 2 && failureCount < 3 && (
            <p className="text-xs text-slate-600">
              ⚠️ Após 3 tentativas falhadas em 30 dias, sua assinatura será cancelada automaticamente.
            </p>
          )}
        </AlertDescription>
      </Alert>
    </motion.div>
  )
}
