import { handleWhatsAppOnboardingCallback } from '@/services/whatsapp/whatsapp-onboarding.service'

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

  return `
  <!DOCTYPE html>
  <html>
    <body>
      <script>
        if (window.opener) {
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
          
          window.close();
        } else {
          window.location.href = '/dashboard/settings/integrations?tab=whatsapp&status=${status}&message=${encodeURIComponent(safeMessage)}';
        }
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
