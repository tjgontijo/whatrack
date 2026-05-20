# E2E Tests (Playwright)

## Visão Geral

A suíte E2E cobre fluxos reais da aplicação usando Playwright, com banco Postgres de teste resetado + seed antes da execução.

Hoje o foco principal está em:

- autenticação e sign-up
- jornada crítica de aquisição (home -> plano -> sign-up -> checkout -> dashboard)

## Estrutura Atual

```text
e2e/
├─ auth/
│  ├─ auth-signup.spec.ts
│  └─ fixtures.ts
├─ billing/
│  ├─ acquisition-signup-checkout.spec.ts
│  ├─ billing-auto-upgrade.spec.ts
│  ├─ billing-auto-upgrade-advanced.spec.ts
│  ├─ full-flow.spec.ts
│  └─ fixtures.ts
├─ shared/
│  ├─ signup.ts
│  ├─ billing.ts
│  └─ auth.ts
├─ debug.spec.ts
├─ login-simple.spec.ts
├─ global-setup.ts
└─ setup.ts
```

## Como o Setup Funciona

1. `playwright.config.ts` carrega `.env`.
2. Se `TEST_DATABASE_URL` estiver definida, ela é aplicada como `DATABASE_URL` durante os testes.
3. `global-setup.ts` chama `setupTestDatabase()`.
4. `setup.ts` executa:
   - `prisma db push --force-reset` (schema limpo)
   - `prisma/seed.ts` (dados base de lookup/billing/system)
4. Testes rodam em sequência (`fullyParallel: false`), reduzindo conflito de dados.

## Comandos Úteis

Reset manual de banco de teste:

```bash
./scripts/db/reset-test.sh
```

Rodar toda a suíte E2E:

```bash
npm run test:e2e
```

Rodar E2E já subindo túnel Cloudflare:

```bash
npm run test:e2e:tunnel
```

Rodar só um spec:

```bash
npx playwright test e2e/billing/acquisition-signup-checkout.spec.ts --reporter=list
```

Abrir modo UI:

```bash
npm run test:e2e:ui
```

Abrir relatório HTML mais recente:

```bash
npm run test:e2e:report
```

## Estado Atual dos Specs

Ativos:

- `e2e/auth/auth-signup.spec.ts`
- `e2e/billing/acquisition-signup-checkout.spec.ts`
- `e2e/billing/billing-auto-upgrade.spec.ts`
- `e2e/billing/billing-auto-upgrade-advanced.spec.ts`
- `e2e/billing/full-flow.spec.ts`
- `e2e/login-simple.spec.ts`
- `e2e/debug.spec.ts`

## Helpers Compartilhados

### `shared/signup.ts`

- `generateTestEmail()`
- `generateTestPassword()`
- `generateTestName()` (faker)
- `signUp(page, data)`
- `waitForSignUpSuccess(page, timeout)`

### `shared/billing.ts`

- cartões sandbox do Asaas
- preenchimento de cartão no checkout atual
- helpers de sucesso/erro de pagamento

### `shared/auth.ts`

- login reutilizável para testes que exigem usuário já autenticado

### `shared/acquisition.ts`

- jornada paga ponta a ponta (home -> sign-up -> checkout -> dashboard)
- geração de CPF válido
- helpers para criação/listagem de projetos e leitura de assinatura via API

## Fluxo Crítico Coberto Hoje

`billing/acquisition-signup-checkout.spec.ts` valida:

1. acesso à home
2. clique no CTA de plano
3. sign-up com dados dinâmicos (email/nome/CPF válido)
4. criação de conta + onboarding (`/api/v1/auth` e `/api/v1/onboarding/setup`)
5. checkout de cartão (`/api/v1/billing/checkout`)
6. redirecionamento para sucesso e entrada no dashboard
7. cleanup ao final: cancela assinatura no app e remove assinatura + cliente no Asaas (sandbox)

## Pré-requisitos de Ambiente

`.env` precisa estar consistente para E2E:

- `TEST_DATABASE_URL` (Postgres de teste)
- `ASAAS_BASE_URL` (sandbox)
- `ASAAS_API_KEY` válida
- credenciais mínimas de auth/app

Importante:

- não escapar manualmente a chave Asaas (`$` deve ser literal, sem `\`)
- quando existir servidor já rodando em `:3000`, o Playwright pode reutilizar (`reuseExistingServer`), então o ambiente desse servidor precisa estar alinhado com o teste

## Webhook em Ambiente Local

Para validar webhook real de billing localmente, usar túnel público:

- endpoint: `https://<host-publico>/api/v1/billing/webhook`
- header esperado: `asaas-access-token`
- token deve bater com `ASAAS_WEBHOOK_TOKEN` do servidor que está rodando

Também é possível deixar o Playwright subir o `cloudflared` automaticamente:

- `E2E_START_CLOUDFLARE_TUNNEL=true` habilita o túnel durante os testes
- `E2E_FORCE_NEW_SERVER=true` impede reaproveitar servidor antigo em `:3000` (evita ambiente incorreto)
- `E2E_CLOUDFLARE_TUNNEL_COMMAND` sobrescreve o comando padrão
- `E2E_CLOUDFLARE_TUNNEL_URL` sobrescreve a URL usada para healthcheck do túnel

## Relatório HTML

- Pasta atual do relatório: `e2e/playwright-report/`
- Artefatos (screenshot/video/trace): `e2e/test-results/`
- Se abrir `playwright-report/index.html` na raiz, pode estar vazio/desatualizado.

## O Que Explorar em Seguida

1. Endurecer os asserts de auto-upgrade (ex.: validar troca de plano + fatura de prorating).
2. Separar suíte em blocos (`smoke`, `critical`, `extended`) com scripts dedicados.
3. Adicionar asserts de estado no banco (invoice/subscription) após checkout.
4. Publicar execução em CI com artefatos de vídeo/screenshot por spec crítico.
