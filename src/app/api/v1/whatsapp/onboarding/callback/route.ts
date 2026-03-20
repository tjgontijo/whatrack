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
  const serializedStatus = JSON.stringify(status)
  const serializedMessage = JSON.stringify(safeMessage)
  const serializedStorageKey = JSON.stringify(WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY)
  const serializedStoragePayload = JSON.stringify(
    JSON.stringify({ status, message: safeMessage })
  )
  const redirectTarget = `/welcome?integration=whatsapp&status=${status}&message=${encodeURIComponent(safeMessage)}`
  const serializedRedirectTarget = JSON.stringify(redirectTarget)

  return `
  <!DOCTYPE html>
  <html>
    <body>
      <script>
        try {
          window.localStorage.setItem(${serializedStorageKey}, ${serializedStoragePayload});
        } catch {}

        if (window.opener) {
          try {
            window.opener.postMessage({ 
              type: 'WA_CALLBACK_STATUS', 
              status: ${serializedStatus},
              message: ${serializedMessage} 
            }, window.location.origin);

            ${
              status === 'success'
                ? "window.opener.postMessage({ type: 'WA_CALLBACK_SUCCESS' }, window.location.origin);"
                : ''
            }
          } catch {}
        }

        try { window.close(); } catch {}

        window.location.href = ${serializedRedirectTarget};
      </script>
      <div style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h2>${status === 'success' ? 'Conectado!' : 'Erro na Conexão'}</h2>
        <p>${status === 'success' ? 'Pode fechar esta janela.' : escapeHtml(safeMessage)}</p>
      </div>
    </body>
  </html>
`
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const result = await handleWhatsAppOnboardingCallback({
      code: url.searchParams.get('code'),
      state: url.searchParams.get('state'),
      error: url.searchParams.get('error'),
      errorDescription: url.searchParams.get('error_description'),
    }, url.origin)

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
