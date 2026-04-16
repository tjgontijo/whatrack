'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Copy, Check, ChevronDown, Loader2, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface CheckoutPixQrcodeProps {
  qrCodeImage: string | null
  qrCodePayload: string
  expirationDate: string | null
  invoiceId: string
  statusToken: string
  type: 'pix' | 'pix_automatic'
}

type CheckoutStatus = 'pending' | 'confirmed' | 'received' | 'active'

const POLLING_INTERVAL_MS = 3000

export function CheckoutPixQrcode({
  qrCodeImage,
  qrCodePayload,
  expirationDate,
  invoiceId,
  statusToken,
  type,
}: CheckoutPixQrcodeProps) {
  const [copied, setCopied] = useState(false)
  const [isPolling, setIsPolling] = useState(true)
  const [status, setStatus] = useState<CheckoutStatus>('pending')
  const [expanded, setExpanded] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)

  // Countdown timer
  useEffect(() => {
    if (!expirationDate) return

    const interval = setInterval(() => {
      const now = new Date().getTime()
      const expiration = new Date(expirationDate).getTime()
      const remaining = Math.max(0, expiration - now)

      if (remaining === 0) {
        setIsPolling(false)
        setTimeRemaining(null)
        clearInterval(interval)
      } else {
        setTimeRemaining(remaining)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expirationDate])

  // Status polling
  useEffect(() => {
    if (!isPolling) return

    let isMounted = true

    const poll = async () => {
      try {
        const route = type === 'pix'
          ? `/api/v1/billing/checkout/${invoiceId}/status`
          : `/api/v1/billing/pix-automatic/${invoiceId}/status`

        const response = await fetch(`${route}?token=${statusToken}`)

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setPollError('Token expirado')
            setIsPolling(false)
            return
          }
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()

        if (!isMounted) return

        const newStatus = data.status.toLowerCase() as CheckoutStatus
        if (newStatus !== status) {
          setStatus(newStatus)
        }

        // Stop polling when payment is received/confirmed/active
        if (['confirmed', 'received', 'active'].includes(newStatus)) {
          setIsPolling(false)
        }
      } catch (error) {
        if (isMounted) {
          logger.error({ error, type, invoiceId }, 'Poll error')
        }
      }
    }

    const timer = setInterval(poll, POLLING_INTERVAL_MS)
    poll() // Poll immediately

    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [isPolling, invoiceId, statusToken, type, status])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrCodePayload)
      setCopied(true)
      toast.success('Chave PIX copiada!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Erro ao copiar')
    }
  }

  const formattedTime = timeRemaining
    ? `${Math.floor(timeRemaining / 60000)}:${String(Math.floor((timeRemaining % 60000) / 1000)).padStart(2, '0')}`
    : 'Expirado'

  const statusLabels: Record<CheckoutStatus, string> = {
    pending: 'Aguardando pagamento',
    confirmed: 'Confirmado',
    received: 'Recebido',
    active: 'Ativo',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        {/* Header with collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between mb-4 hover:opacity-70 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-slate-700" />
            <h3 className="font-semibold text-slate-900">Código PIX</h3>
          </div>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-slate-600" />
          </motion.div>
        </button>

        {/* Status indicator */}
        <div className="flex items-center gap-2 mb-4 px-2">
          <div
            className={`w-2 h-2 rounded-full animate-pulse ${
              status === 'pending' ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
          <span className="text-sm text-slate-600">{statusLabels[status]}</span>
          {isPolling && <Loader2 className="h-3 w-3 animate-spin text-slate-500" />}
        </div>

        {/* Countdown timer */}
        {expirationDate && (
          <div className="mb-4 px-2">
            <div className="text-xs text-slate-500">Expira em:</div>
            <div className="text-2xl font-mono font-bold text-slate-900">{formattedTime}</div>
          </div>
        )}

        {/* Expandable content */}
        <motion.div
          initial={false}
          animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="space-y-4 pt-2">
            {/* QR Code */}
            {qrCodeImage && (
              <div className="flex justify-center">
                <img
                  alt="QR Code PIX"
                  src={`data:image/png;base64,${qrCodeImage}`}
                  className="h-40 w-40 rounded-lg border-2 border-slate-200 bg-white p-3 shadow-sm"
                />
              </div>
            )}

            {/* PIX Key / Payload */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Chave PIX (copia e cola)
              </div>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={qrCodePayload}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md text-slate-700 focus:outline-none"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2 text-sm text-slate-600">
              <p className="font-semibold text-slate-700">Passo a passo:</p>
              <ol className="space-y-1 list-decimal list-inside text-xs">
                <li>Abra seu app de banco</li>
                <li>Selecione a opção "PIX"</li>
                <li>Escolha "Copia e cola"</li>
                <li>Cole a chave acima</li>
                <li>Confirme o pagamento</li>
              </ol>
            </div>

            {/* Error message */}
            {pollError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {pollError}
              </div>
            )}
          </div>
        </motion.div>

        {/* Status message on success */}
        {['confirmed', 'received', 'active'].includes(status) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            Pagamento recebido com sucesso!
          </motion.div>
        )}
      </Card>
    </motion.div>
  )
}
