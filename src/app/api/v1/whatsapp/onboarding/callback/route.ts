import { handleWhatsAppOnboardingCallback } from '@/services/whatsapp/whatsapp-onboarding.service'

const APP_URL = process.env.APP_URL

const RESPONSE_HTML = (status: 'success' | 'error', message?: string) => `
  <!DOCTYPE html>
  <html>
    <body>
      <script>
        if (window.opener) {
          window.opener.postMessage({ 
            type: 'WA_CALLBACK_STATUS', 
            status: '${status}',
            message: '${message || ''}' 
          }, window.location.origin);
          
          window.opener.postMessage({ type: 'WA_CALLBACK_SUCCESS' }, window.location.origin);
          
          window.close();
        } else {
          window.location.href = '/dashboard/settings/integrations?tab=whatsapp&status=${status}&message=${encodeURIComponent(message || '')}';
        }
      </script>
      <div style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h2>${status === 'success' ? 'Conectado!' : 'Erro na Conexão'}</h2>
        <p>${status === 'success' ? 'Pode fechar esta janela.' : message}</p>
      </div>
    </body>
  </html>
`

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
