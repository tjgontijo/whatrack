import { NextRequest, NextResponse } from 'next/server'

import { completeMetaAdsOAuthCallback } from '@/services/meta-ads/meta-oauth.service'

function successPopupResponse(req: NextRequest) {
  const dashboardUrl = new URL('/welcome?integration=meta-ads&status=success', req.url).toString()
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Meta Ads conectado</title>
  </head>
  <body>
    <script>
      (function () {
        try {
          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage({ type: 'meta-ads-oauth-success' }, window.location.origin);
            } catch (_) {}
            window.close();
            return;
          }
        } catch (_) {}

        window.location.replace(${JSON.stringify(dashboardUrl)});
      })();
    </script>
  </body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const stateToken = searchParams.get('state')

  if (!code || !stateToken) {
    return NextResponse.redirect(
      new URL('/welcome?integration=meta-ads&status=error&error=meta_auth_failed', req.url)
    )
  }

  const redirectUri = new URL('/api/v1/meta-ads/callback', req.url).toString()
  const result = await completeMetaAdsOAuthCallback(code, stateToken, redirectUri)

  if (!result.success) {
    return NextResponse.redirect(
      new URL(`/welcome?integration=meta-ads&status=error&error=${result.reason}`, req.url)
    )
  }

  return successPopupResponse(req)
}
