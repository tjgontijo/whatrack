import { handleWhatsAppOnboardingCallback } from '@/services/whatsapp/whatsapp-onboarding.service'
import { WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY } from '@/lib/whatsapp/onboarding'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const RESPONSE_HTML = (status: 'success' | 'error', message?: string) => {
  const safeMessage = message ?? ''
  const serializedStorageKey = JSON.stringify(WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY)
  const serializedStoragePayload = JSON.stringify(JSON.stringify({ status, message: safeMessage }))
  const msgType = status === 'success' ? 'WA_CALLBACK_SUCCESS' : 'WA_CALLBACK_ERROR'
  const serializedMsg = JSON.stringify({ type: msgType, message: safeMessage })

  return `<!DOCTYPE html>
<html>
  <head>
    <title>${status === 'success' ? 'WhatsApp Conectado' : 'Erro'}</title>
    <style>
      body { font-family: -apple-system, sans-serif; text-align: center; padding: 60px 40px; background: #fff; }
      h2 { font-size: 20px; margin: 0 0 8px; }
      p { color: #666; font-size: 14px; margin: 0; }
    </style>
  </head>
  <body>
    <h2>${status === 'success' ? '✅ Conectado com sucesso!' : '❌ Erro na conexão'}</h2>
    <p>${status === 'success' ? 'Pode fechar esta janela.' : escapeHtml(safeMessage)}</p>
    <script>
      // 1. Write to localStorage so the opener reads it via storage event
      try { localStorage.setItem(${serializedStorageKey}, ${serializedStoragePayload}); } catch(e) {}

      // 2. Send postMessage to opener (the main whatrack window)
      var target = window.opener || window.parent;
      if (target && target !== window) {
        try { target.postMessage(${serializedMsg}, '*'); } catch(e) {}
      }

      // 3. Close this popup after a short delay
      setTimeout(function() { window.close(); }, 500);
    </script>
  </body>
</html>`
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    console.log('[OnboardingCallback] 🔍 Received callback:', {
      hasCode: !!code,
      hasState: !!state,
      hasError: !!error,
      state: state?.substring(0, 10),
      error,
    })

    const result = await handleWhatsAppOnboardingCallback({
      code,
      state,
      error,
      errorDescription,
    }, url.origin)

    console.log('[OnboardingCallback] Result:', result)

    if (!result.success) {
      return new Response(RESPONSE_HTML('error', result.message), {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    return new Response(RESPONSE_HTML('success'), {
      headers: { 'Content-Type': 'text/html' }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return new Response(RESPONSE_HTML('error', message), {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}
