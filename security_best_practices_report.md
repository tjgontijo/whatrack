# Security Best Practices Report

## Executive Summary

O projeto está perto do launch do ponto de vista funcional, mas ainda há lacunas de segurança que eu trataria como bloqueadores ou quase-bloqueadores de go-live. O maior risco atual é a fronteira de autenticação: o `proxy` aceita qualquer cookie com formato "plausível", enquanto algumas rotas operacionais e de teste não têm guarda server-side própria. Também há excesso de logging em webhook sensível, baseline incompleto de headers de segurança no browser e criação de conta sem verificação de e-mail.

Pontos positivos observados durante a revisão:

- `next` está em `16.0.8`, acima da linha mínima corrigida citada pela referência da skill.
- não encontrei `.env` versionado via `git ls-files`.
- não encontrei sinks clássicos de DOM XSS no frontend, como `dangerouslySetInnerHTML`, `innerHTML` ou `eval`.

## High Severity

### SBP-001

- Rule ID: `NEXT-AUTH-001`
- Severity: High
- Location:
  - `src/proxy.ts:34-40`
  - `src/proxy.ts:60-67`
  - `src/app/api/v1/test/publish-message/route.ts:14-35`
  - `src/app/api/v1/health/redis/route.ts:8-19`
  - `src/app/api/v1/whatsapp/history-sync-alerts/route.ts:52-100`
- Evidence:

```ts
function looksLikeSessionCookie(v?: string) {
  if (!v) return false
  const dot = v.indexOf('.')
  if (dot <= 0) return false
  if (dot === v.length - 1) return false
  if (v.length < 30) return false
  return true
}

const hasPlausibleCookie =
  looksLikeSessionCookie(sessionToken) || looksLikeSessionCookie(secureSessionToken)
```

```ts
export async function POST(request: NextRequest) {
  const { channel, data } = await request.json()
  const success = await publishToCentrifugo(channel, data)
}
```

```ts
export async function GET() {
  const payload = await fetchRedisHealthStatus()
  return NextResponse.json(payload)
}
```

- Impact: um atacante pode enviar um cookie sintético com formato válido para atravessar o `proxy` e alcançar endpoints que não validam sessão/permissão no servidor, incluindo publicação arbitrária em tempo real e exposição de health/telemetria interna.
- Fix:
  - não usar heurística de cookie como barreira principal de acesso;
  - adicionar guarda explícita em toda rota não pública;
  - remover ou bloquear em produção `src/app/api/v1/test/**` e `src/app/api/v1/health/**`;
  - tratar `proxy` apenas como camada auxiliar, não como enforcement principal.
- Mitigation:
  - bloquear imediatamente `/api/v1/test/*` e `/api/v1/health/*` no edge/CDN/WAF;
  - exigir auth/token também no `GET` de `history-sync-alerts`, não só no `POST` e no `action=run`.
- False positive notes:
  - se houver bloqueio adicional no edge fora do repositório, ele não está visível no código e precisa ser verificado em runtime.

## Medium Severity

### SBP-002

- Rule ID: `NEXT-SECRETS-001`
- Severity: Medium
- Location: `src/app/api/v1/billing/webhook/route.ts:41-72`
- Evidence:

```ts
const allHeaders: Record<string, string> = {}
request.headers.forEach((value, key) => {
  allHeaders[key] = value
})
logger.info({ headers: allHeaders }, '[Webhook/Debug] All request headers')
```

```ts
logger.warn(
  {
    signature: signature,
    computedHash: computedHash,
    bodyLength: body.length,
    bodyPreview: body.substring(0, 100),
  },
  'Webhook signature validation failed'
)
```

- Impact: logs passam a concentrar material sensível do webhook, incluindo assinatura recebida, hash calculado e trecho do payload; qualquer pessoa com acesso aos logs ganha visibilidade operacional e de autenticação que não deveria existir.
- Fix:
  - remover logging de headers completos, assinatura recebida e hash calculado;
  - manter apenas `eventId`, `eventType`, origem e um erro resumido;
  - usar `crypto.timingSafeEqual` para comparação de assinatura depois de normalizar buffers/base64.
- Mitigation:
  - reduzir retenção/acesso de logs deste endpoint até o código ser limpo;
  - revisar outros logs de OAuth/webhook para garantir que tokens, códigos e segredos não entram em observabilidade.
- False positive notes:
  - se os logs ficarem isolados em ambiente altamente restrito, o risco diminui, mas ainda é uma prática insegura para produção.

### SBP-003

- Rule ID: `NEXT-DEPLOY-001`
- Severity: Medium
- Location: `next.config.ts:10-27`
- Evidence:

```ts
headers: async () => {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
      ],
    },
  ]
}
```

- Impact: o baseline de proteção no browser está incompleto; hoje o app não mostra CSP, `Referrer-Policy` ou `Permissions-Policy` no código, então qualquer XSS ou script third-party teria menos contenção e mais capacidade de exfiltração.
- Fix:
  - adicionar CSP adequada ao app (preferencialmente por header em produção);
  - adicionar `Referrer-Policy` e `Permissions-Policy`;
  - manter `X-Frame-Options` ou migrar a política de frame para CSP `frame-ancestors`;
  - não depender de `X-XSS-Protection`, que é legado e não substitui CSP.
- Mitigation:
  - se esses headers já forem injetados pelo edge, documentar e validar via smoke/runtime.
- False positive notes:
  - a proteção pode existir no CDN/WAF/hosting e não estar visível no repositório; precisa ser confirmada com inspeção de headers reais em produção/staging.

### SBP-004

- Rule ID: `NEXT-AUTH-001`
- Severity: Medium
- Location: `src/lib/auth/auth.ts:39-43`
- Evidence:

```ts
emailAndPassword: {
  enabled: true,
  requireEmailVerification: false,
  autoSignIn: true,
}
```

- Impact: qualquer usuário consegue criar conta e entrar imediatamente sem provar posse da caixa de e-mail, o que enfraquece a identidade do usuário em fluxos de convite, recuperação e ownership de conta.
- Fix:
  - habilitar verificação de e-mail em produção;
  - ou, se isso atrasar o launch, permitir cadastro sem verificação apenas para trial e bloquear ações sensíveis até o e-mail ser validado.
- Mitigation:
  - exigir e-mail verificado para aceitar convites de organização, alterar senha, conectar integrações ou iniciar cobrança.
- False positive notes:
  - se o produto aceitar deliberadamente contas não verificadas por estratégia comercial, documentar a exceção e impor restrições de permissão até a verificação.

## Recommended Launch Order

1. Corrigir `SBP-001`: autenticação explícita em rotas internas e remoção/bloqueio de endpoints de teste/health.
2. Corrigir `SBP-002`: limpar logs sensíveis de webhook e OAuth.
3. Corrigir `SBP-003`: subir baseline de headers/CSP.
4. Decidir política de verificação de e-mail de `SBP-004`.
