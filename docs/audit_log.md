# PRD — Sistema de Auditoria

**Projeto:** Whatrack
**Stack:** Next.js 16 · Prisma · PostgreSQL · Better Auth · Redis · Pino
**Status:** Em implementação

---

## 1. Objetivo

Implementar um sistema de auditoria confiável, performático e rastreável que registre ações críticas de usuários e do sistema, garantindo:

- Rastreabilidade completa por organização (multi-tenant)
- Suporte a compliance (LGPD, SOC2)
- Investigação de incidentes
- Observabilidade estruturada via Pino

---

## 2. Estado Atual

Já implementado e **não deve ser refeito**:

| Item                             | Localização                              |
| -------------------------------- | ---------------------------------------- |
| `OrgAuditLog` (Prisma model)     | `prisma/schema.prisma`                   |
| `createAuditLog()` service       | `src/lib/audit-log.ts`                   |
| `WhatsAppAuditService`           | `src/services/whatsapp/audit.service.ts` |
| Uso em 4+ routes (org, meta-ads) | `src/app/api/v1/`                        |

---

## 3. Arquitetura

```
Request
  ↓
src/proxy.ts (Node.js runtime)
  ├── gera requestId (UUID)
  ├── extrai ip + userAgent dos headers
  ├── popula AsyncLocalStorage com o contexto
  └── injeta header X-Request-Id na response
  ↓
Route Handler / Server Action
  ↓
AuditService.log()  ← lê contexto do ALS automaticamente (requestId, ip, userAgent)
  ↓
Prisma → OrgAuditLog (Postgres)   ← persistência imutável
Pino logger                        ← observabilidade + erros
```

**Por que o ALS funciona no `proxy.ts` do Next.js 16:**

No Next.js 16, `proxy.ts` roda no **Node.js runtime** (não Edge). Isso significa que `async_hooks` / `AsyncLocalStorage` estão disponíveis diretamente no `proxy`, ao contrário do `middleware.ts` legado que rodava no Edge Runtime e não tinha acesso ao Node.js nativo.

**Separação de responsabilidades:**

- `src/proxy.ts` → ponto de entrada: gera `requestId`, captura `ip`/`userAgent`, popula ALS
- `AsyncLocalStorage` → propaga contexto HTTP por toda a cadeia sem passar parâmetros
- `AuditService` → eventos de negócio (chamada explícita nas routes críticas)
- `Prisma Middleware` → captura automática em models selecionados
- `Pino` → logging estruturado para erros, eventos críticos e debug

---

## 4. Requisitos Funcionais

### RF01 — Contexto automático por request

Todo audit log deve incluir automaticamente (via ALS, sem passar nos parâmetros):

- `requestId` — UUID gerado no `proxy.ts`, propaga por toda a cadeia via ALS e header `X-Request-Id`
- `ip` — extraído do header `x-forwarded-for` ou `x-real-ip` no `proxy.ts`
- `userAgent` — header `user-agent` capturado no `proxy.ts`

### RF02 — Auditoria de eventos de negócio (manual)

Chamada explícita nas routes/services para eventos que importam:

```ts
await auditService.log({
  action: 'member.role_changed',
  resourceType: 'member',
  resourceId: memberId,
  before: { role: 'user' },
  after: { role: 'admin' },
})
```

Contexto (organizationId, userId, ip, userAgent, requestId) é injetado automaticamente pelo ALS.

### RF03 — Auditoria automática via Prisma Middleware (allowlist)

Captura automática de CREATE/UPDATE/DELETE apenas nos models críticos:

```
allowlist: Organization, OrganizationMember, MetaAdsConnection, WhatsAppConnection
```

Modelos de alto volume (Ticket, Message, Lead) **não entram** no middleware — auditados manualmente se necessário.

Para UPDATE: captura `before` via `findUnique` **somente** se o model estiver no allowlist.

### RF04 — Auditoria de autenticação (Better Auth hooks)

Registrar via `databaseHooks` do Better Auth:

- `signIn.after` → `auth.login`
- `signUp.after` → `auth.register`
- Falha de login → `auth.login_failed` (via endpoint customizado se necessário)

`userId` pode ser `null` para eventos de sistema/cron — o campo deve ser nullable.

### RF05 — Diff de dados (UPDATE)

UPDATE deve armazenar `before` e `after`. Campos sensíveis são removidos antes de persistir:

```ts
// sanitizeForAudit() remove automaticamente:
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'cpf', 'hash']
```

### RF06 — Ações de sistema (cron, webhooks)

`userId` nullable permite auditar ações automatizadas:

```ts
await auditService.log({
  action: 'cron.ai_classifier_run',
  resourceType: 'system',
  // userId ausente — sistema, não usuário
})
```

---

## 5. Requisitos Não Funcionais

### RNF01 — Performance

Auditoria não deve bloquear o request principal.

- Estratégia: `void auditService.log(...)` — fire-and-forget com catch interno
- Meta: impacto < 5ms por operação

### RNF02 — Imutabilidade

`OrgAuditLog` é append-only. Nenhum UPDATE ou DELETE permitido na tabela.

### RNF03 — Nunca jogar erro

`auditService.log()` nunca lança exceção. Falhas são logadas via Pino e o request continua.

### RNF04 — Mascaramento de dados sensíveis

`sanitizeForAudit()` é aplicada automaticamente em `before` e `after` antes de persistir.

---

## 6. Modelagem de Dados

### Migration necessária no `OrgAuditLog`

Campos a adicionar na migration:

```sql
-- Tornar userId nullable (suporte a ações de sistema)
ALTER TABLE org_audit_logs ALTER COLUMN user_id DROP NOT NULL;

-- Novos campos de contexto HTTP
ALTER TABLE org_audit_logs ADD COLUMN ip          VARCHAR(45);
ALTER TABLE org_audit_logs ADD COLUMN user_agent  TEXT;
ALTER TABLE org_audit_logs ADD COLUMN request_id  VARCHAR(36);
ALTER TABLE org_audit_logs ADD COLUMN metadata    JSONB;

-- Índice para correlação por request
CREATE INDEX idx_org_audit_logs_request_id ON org_audit_logs (request_id);
```

### Schema Prisma final

```prisma
model OrgAuditLog {
  id             String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String       @db.Uuid
  userId         String?      @db.Uuid    // nullable: suporta ações de sistema
  action         String
  resourceType   String
  resourceId     String?
  before         Json?
  after          Json?
  ip             String?
  userAgent      String?
  requestId      String?
  metadata       Json?
  createdAt      DateTime     @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User?        @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([organizationId])
  @@index([userId])
  @@index([createdAt])
  @@index([requestId])
  @@map("org_audit_logs")
}
```

---

## 7. Pino — Logging Estruturado

### Por que Pino agora

Entrar com Pino no início do projeto é zero custo. Migrar `console.*` depois custa muito mais. Pino oferece:

- Logs em JSON estruturado (indexável em BetterStack/Loki/Elastic)
- Redaction nativa de campos sensíveis
- Serialização de `requestId` automática via `child()`
- Performance 5-10x superior ao console em produção

### Instalação

```bash
pnpm add pino pino-pretty
```

### Estrutura

```
src/lib/logger.ts          ← instância base do Pino
src/lib/request-context.ts ← AsyncLocalStorage com requestId, ip, userAgent
src/proxy.ts               ← gera requestId, popula ALS, adiciona header X-Request-Id
```

### Logger base (`src/lib/logger.ts`)

```ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: ['password', 'token', 'secret', 'cpf', 'authorization'],
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty' },
  }),
})
```

### Uso com contexto de request

```ts
// Dentro de um route handler — logger já tem requestId via child
const log = logger.child({ requestId: getRequestContext()?.requestId })

log.info({ action: 'member.removed', memberId }, 'Member removed')
log.error({ err }, 'Audit log failed')
```

### Integração com destinos externos

| Ambiente        | Destino                                                          |
| --------------- | ---------------------------------------------------------------- |
| Desenvolvimento | `pino-pretty` (terminal legível)                                 |
| Produção        | BetterStack Logs (via `pino-http` transport) ou stdout → coletor |

---

## 8. AsyncLocalStorage — Contexto de Request

### Problema resolvido

Sem ALS, cada chamada a `createAuditLog()` exige passar `ip`, `userAgent`, `requestId` manualmente — verboso e propenso a esquecimento.

### Implementação

**`src/lib/request-context.ts`**

```ts
import { AsyncLocalStorage } from 'async_hooks'

export interface RequestContext {
  requestId: string
  ip: string | null
  userAgent: string | null
  organizationId?: string
  userId?: string
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>()

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore()
}
```

**`src/proxy.ts`** — extender a função `proxy` existente

```ts
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requestContextStorage } from '@/lib/request-context'

export function proxy(request: NextRequest) {
  const requestId = randomUUID()
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    null
  const userAgent = request.headers.get('user-agent') ?? null

  // Popula o ALS — disponível em toda a cadeia do Node.js runtime
  return requestContextStorage.run({ requestId, ip, userAgent }, () => {
    // ... lógica existente de auth/redirect ...
    const res = NextResponse.next({
      request: { headers: new Headers(request.headers) },
    })
    res.headers.set('X-Request-Id', requestId)
    return res
  })
}
```

> **Por que funciona:** `proxy.ts` no Next.js 16 roda no **Node.js runtime**, então `AsyncLocalStorage` do `async_hooks` funciona nativamente. Era impossível no `middleware.ts` legado (Edge Runtime).

---

## 9. AuditService — Interface Unificada

Substituir a função atual `createAuditLog()` por uma classe que:

1. Lê contexto do ALS automaticamente
2. Sanitiza `before`/`after`
3. Persiste no banco
4. Loga via Pino

**`src/lib/audit.service.ts`**

```ts
interface AuditLogInput {
  organizationId: string
  action: string
  resourceType: string
  resourceId?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  userId?: string // opcional — sistema pode não ter userId
  metadata?: Record<string, unknown>
}

class AuditService {
  async log(input: AuditLogInput): Promise<void>
}

export const auditService = new AuditService()
```

**Comportamento interno:**

1. Obtém `{ requestId, ip, userAgent }` via `getRequestContext()`
2. Chama `sanitizeForAudit(input.before)` e `sanitizeForAudit(input.after)`
3. Executa `prisma.orgAuditLog.create()` via `void` (não bloqueia)
4. Em caso de erro: `logger.error({ err, action }, 'Audit log failed')` — nunca relança

---

## 10. Prisma Middleware (Seletivo)

```ts
const AUDIT_MODELS = new Set([
  'Organization',
  'OrganizationMember',
  'MetaAdsConnection',
  'WhatsAppConnection',
])

prisma.$use(async (params, next) => {
  if (!AUDIT_MODELS.has(params.model ?? '')) return next(params)
  if (!['create', 'update', 'delete'].includes(params.action)) return next(params)

  const before =
    params.action === 'update'
      ? await prisma[params.model].findUnique({ where: params.args.where })
      : null

  const result = await next(params)

  void auditService.log({
    action: `${params.model?.toLowerCase()}.${params.action}`,
    resourceType: params.model!,
    before: before ?? undefined,
    after: result,
    // organizationId e userId vêm do ALS via getRequestContext()
  })

  return result
})
```

---

## 11. Plano de Implementação

### Fase 1 — Infraestrutura (foundation)

- [ ] Instalar `pino` e `pino-pretty`
- [ ] Criar `src/lib/logger.ts`
- [ ] Criar `src/lib/request-context.ts` (ALS)
- [ ] Estender `src/proxy.ts` com geração de `requestId` + população do ALS + header `X-Request-Id`
- [ ] Substituir `console.*` em `src/lib/` e `src/services/` pelo logger Pino

### Fase 2 — Migration do modelo

- [ ] Adicionar campos `ip`, `userAgent`, `requestId`, `metadata` ao `OrgAuditLog`
- [ ] Tornar `userId` nullable
- [ ] Rodar `prisma migrate dev`

### Fase 3 — AuditService refatorado

- [ ] Criar `src/lib/audit.service.ts` com leitura automática do ALS
- [ ] Criar `src/lib/audit-sanitize.ts` com `sanitizeForAudit()`
- [ ] Migrar chamadas de `createAuditLog()` para `auditService.log()`

### Fase 4 — Auth audit hooks

- [ ] Adicionar hooks `signIn.after` e `signUp.after` no `src/lib/auth/auth.ts`
- [ ] Registrar eventos `auth.login` e `auth.register` via `auditService`

### Fase 5 — Prisma Middleware seletivo

- [ ] Implementar middleware em `src/lib/prisma.ts` com allowlist
- [ ] Testar impacto de performance (target: < 5ms adicional)

---

## 12. Fora do Escopo (pós-MVP)

| Item                             | Motivo                                |
| -------------------------------- | ------------------------------------- |
| Particionamento mensal           | Volume atual não justifica            |
| Arquivamento S3                  | Definir política de retenção primeiro |
| Alertas de exclusões massivas    | Via BetterStack/Sentry depois         |
| UI de visualização de audit logs | Pós-MVP                               |

---

## 13. Métricas de Sucesso

- 100% das ações em models críticos auditadas automaticamente
- 100% dos eventos de negócio com `requestId` rastreável
- Latência adicional < 5ms por operação
- Zero erros silenciosos — falhas sempre logadas via Pino
- Nenhum dado sensível (password, token, CPF) persistido no audit log
