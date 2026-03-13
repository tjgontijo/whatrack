'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function WhatsAppCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (typeof window !== 'undefined') {
      if (window.opener) {
        // We are in a popup
        if (code) {
          window.opener.postMessage({
            type: 'WA_CALLBACK_DATA',
            status: 'success',
            code,
            state
          }, window.location.origin)
        } else if (error) {
          window.opener.postMessage({
            type: 'WA_CALLBACK_DATA',
            status: 'error',
            error
          }, window.location.origin)
        }
        
        // Brief delay to ensure message is sent
        setTimeout(() => window.close(), 500)
      } else {
        // Direct access, redirect to integrations
        router.push('/dashboard/settings/integrations?tab=whatsapp')
      }
    }
  }, [searchParams, router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="p-8 text-center bg-white rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Processando conexão...</h2>
        <p className="text-slate-600">Você já pode fechar esta janela se ela não fechar automaticamente.</p>
      </div>
    </div>
  )
}
