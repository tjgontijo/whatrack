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
  const serializedMessage = JSON.stringify(safeMessage)

  const postMessageCode = status === 'success'
    ? "window.parent.postMessage({ type: 'WA_CALLBACK_SUCCESS', message: '' }, '*');"
    : "window.parent.postMessage({ type: 'WA_CALLBACK_ERROR', message: " + serializedMessage + " }, '*');"

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <title>${status === 'success' ? 'Conectado!' : 'Erro'}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 40px; background: #f5f5f5; }
        h2 { margin: 0 0 10px 0; }
        p { margin: 10px 0 0 0; color: #666; }
        .debug { margin-top: 20px; padding: 10px; background: white; border-radius: 4px; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <h2>${status === 'success' ? '✅ Conectado!' : '❌ Erro na Conexão'}</h2>
      <p>${status === 'success' ? 'Aguarde enquanto processamos sua conexão...' : escapeHtml(safeMessage)}</p>
      <div class="debug">Comunicando com a aplicação...</div>

      <script>
        console.log('[OnboardingCallback] Script running');
        console.log('[OnboardingCallback] window.parent:', window.parent);
        console.log('[OnboardingCallback] window.opener:', window.opener);
        console.log('[OnboardingCallback] window.location.origin:', window.location.origin);

        // Send message to parent window (iframe parent)
        try {
          console.log('[OnboardingCallback] Sending postMessage to parent...');
          ${postMessageCode}
          console.log('[OnboardingCallback] ✅ postMessage sent to parent');
        } catch (e) {
          console.error('[OnboardingCallback] Error sending to parent:', e);
        }

        // Also try window.opener for popup windows
        if (window.opener) {
          try {
            console.log('[OnboardingCallback] Sending postMessage to opener...');
            ${postMessageCode}
            console.log('[OnboardingCallback] ✅ postMessage sent to opener');
          } catch (e) {
            console.error('[OnboardingCallback] Error sending to opener:', e);
          }
        }
      </script>
    </body>
  </html>
`
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
