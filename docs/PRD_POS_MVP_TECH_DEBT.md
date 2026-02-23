# PRD — Dívida Técnica Pós-MVP

**Data:** 2026-02-23
**Origem:** Auditoria de código sênior (AUDIT_MVP_2026-02-23.md)
**Status:** Pendente de implementação

---

## Contexto

Com os itens críticos e de alta prioridade resolvidos antes do lançamento (env vars sem fallback, OAuth CSRF, rate limiting fail-secure, guards de membership), o MVP está apto para deploy. Este PRD organiza os itens restantes por impacto e esforço para execução pós-lançamento.

---

## EP-1 — Qualidade de Código e Arquitetura

### T-01 — Extrair lógica de negócio de rotas grandes

**Prioridade:** Alta
**Esforço:** Médio

`src/app/api/v1/tickets/route.ts` tem ~527 linhas com filtragem, agregação, parsing de datas e transformação de resposta diretamente no handler. Viola o princípio de thin routes.

**Critérios de aceitação:**

- Criar `src/services/tickets/ticket.service.ts` com os métodos `list()`, `create()`, `update()`, `delete()`
- O route handler passa a ter no máximo 20-30 linhas: valida auth, chama service, retorna JSON
- Sem regressão funcional nos endpoints de tickets

**Arquivos afetados:**

- `src/app/api/v1/tickets/route.ts`
- `src/app/api/v1/tickets/[id]/route.ts` (verificar se existe)
- Criar: `src/services/tickets/ticket.service.ts`

---

### T-02 — Dividir componentes com mais de 400 linhas

**Prioridade:** Alta
**Esforço:** Alto

Componentes grandes dificultam manutenção, code review e testes. Lista completa:

| Arquivo                                                    | Linhas | Estratégia de divisão                                     |
| ---------------------------------------------------------- | ------ | --------------------------------------------------------- |
| `src/components/onboarding/onboarding-overlay.tsx`         | ~858   | Um componente por step do onboarding                      |
| `src/components/ui/sidebar.tsx`                            | ~701   | Extrair `SidebarNav`, `SidebarUser`, `SidebarOrg`         |
| `src/services/whatsapp/meta-cloud.service.ts`              | ~641   | Separar cliente HTTP, lógica de WABA, lógica de templates |
| `src/components/whatsapp/settings/webhooks-view.tsx`       | ~607   | Separar form de configuração + preview de payload         |
| `src/components/dashboard/whatsapp/inbox/ticket-panel.tsx` | ~484   | `TicketHeader`, `MessageList`, `TicketActions`            |
| `src/services/whatsapp/handlers/message.handler.ts`        | ~449   | Separar criação vs enriquecimento de mensagem             |

**Critérios de aceitação:**

- Nenhum componente ou service acima de 400 linhas (exceto casos justificados com comentário)
- Sem regressão visual ou funcional
- Sub-componentes são co-localizados no mesmo diretório do pai

---

### T-03 — Padronizar validação de query params com Zod

**Prioridade:** Média
**Esforço:** Baixo

Atualmente vários endpoints usam parsing manual com `parseInt()` e fallbacks inline.

**Padrão alvo:**

```typescript
const paramsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
})
const params = paramsSchema.parse(Object.fromEntries(searchParams))
```

**Arquivos afetados:**

- `src/app/api/v1/leads/route.ts`
- `src/app/api/v1/tickets/route.ts`
- Qualquer rota com `parseInt(searchParams.get(...))`

**Critérios de aceitação:**

- Zero usos de `parseInt(searchParams.get(...))` nos handlers
- Erros de validação retornam 400 com mensagem clara

---

### T-04 — Padronizar formato de resposta de erro

**Prioridade:** Média
**Esforço:** Baixo

Endpoints retornam erros em formatos inconsistentes. Isso dificulta o tratamento no frontend.

**Padrão alvo:** Criar `src/lib/api-response.ts`:

```typescript
export function apiError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(process.env.NODE_ENV !== 'production' && details ? { details } : {}) },
    { status }
  )
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}
```

**Critérios de aceitação:**

- Utilitário criado e documentado
- Pelo menos os endpoints de tickets, leads e meta-ads migrados para o novo padrão
- Nenhum endpoint expõe `error.stack` em produção

---

## EP-2 — Segurança e Resiliência

### T-05 — Migrar cache in-memory para Redis

**Prioridade:** Alta
**Esforço:** Baixo

`src/app/api/v1/leads/route.ts` usa `Map` local com TTL de 3 segundos. Em Vercel (serverless multi-instância), cada instância tem seu próprio mapa — o cache é ineficaz ou retorna dados divergentes entre instâncias.

**Critérios de aceitação:**

- Cache de leads migrado para Redis com `getRedis().setex()` e `getRedis().get()`
- TTL mantido em 3 segundos (ou ajustado conforme necessidade)
- Sem cache quando Redis não está disponível (fail sem cache é melhor que dado inconsistente)

---

### T-06 — Rotação de chaves de criptografia

**Prioridade:** Alta
**Esforço:** Médio

`src/lib/encryption.ts` usa uma única `TOKEN_ENCRYPTION_KEY`. Se comprometida, todos os tokens armazenados ficam expostos sem possibilidade de migração incremental.

**Estratégia:**
Incluir versão da chave no dado criptografado:

```
v1:{iv}:{authTag}:{ciphertext}
```

Suporte a múltiplas chaves ativas durante rotação:

```typescript
// ENCRYPTION_KEYS = JSON com { "v1": "hex...", "v2": "hex..." }
// ENCRYPTION_CURRENT_VERSION = "v2"
```

**Critérios de aceitação:**

- Formato de ciphertext inclui prefixo de versão
- `decrypt()` suporta qualquer versão conhecida
- `encrypt()` sempre usa a versão corrente (`ENCRYPTION_CURRENT_VERSION`)
- Migration script para re-encrypt tokens existentes para nova versão
- Backward compatible — tokens sem prefixo de versão tratados como `v1`

---

### T-07 — Audit log para operações organizacionais

**Prioridade:** Média
**Esforço:** Médio

O modelo `WhatsAppAuditLog` existe para WhatsApp, mas não há equivalente para operações que afetam membros, roles e configurações da organização.

**Operações que devem gerar log:**

- Alteração de role de membro
- Remoção de membro
- Atualização de configurações da organização
- Conexão/desconexão Meta Ads OAuth
- Alteração de configurações de webhook

**Critérios de aceitação:**

- Novo model `OrgAuditLog` no schema Prisma com: `organizationId`, `userId`, `action`, `resourceType`, `resourceId`, `before` (JSON), `after` (JSON), `createdAt`
- Migração Prisma gerada e aplicável
- Os endpoints listados acima criam log antes de retornar sucesso
- Nenhum log expõe dados sensíveis (tokens, senhas)

---

### T-08 — Rate limit no endpoint Centrifugo

**Prioridade:** Baixa
**Esforço:** Mínimo

`GET /api/v1/centrifugo/token` não tem rate limiting. Um usuário autenticado poderia gerar tokens em volume.

**Critérios de aceitação:**

- `rateLimitMiddleware` aplicado com config: IP 60/hr, burst 5/min
- Configuração adicionada ao `DEFAULT_RATE_LIMITS` em `rate-limit.middleware.ts`

---

### T-09 — Tratar race condition na criação de leads

**Prioridade:** Baixa
**Esforço:** Mínimo

Duas requisições simultâneas com o mesmo telefone podem gerar erro de unique constraint não tratado.

**Critérios de aceitação:**

- `prisma.lead.create()` substituído por `prisma.lead.upsert()` onde aplicável, ou
- Erro de unique constraint (`P2002`) capturado e retornado como 409 Conflict com mensagem clara

---

## EP-3 — TODOs Funcionais

### T-10 — Email de notificação para convites de equipe

**Prioridade:** Alta
**Esforço:** Baixo

Endpoint de convite tem `// TODO: Send invitation email`. Usuários convidados não recebem notificação.

**Critérios de aceitação:**

- Ao criar convite, disparar email via `resendProvider` com link de aceite
- Template de email inclui: nome da organização, quem convidou, link de aceite com expiração
- Falha no envio de email não deve reverter a criação do convite (log de erro, convite persiste)

---

### T-11 — Alertas de falha no webhook retry job

**Prioridade:** Média
**Esforço:** Baixo

`src/jobs/webhook-retry.job.ts` tem `// TODO: Send notification to admin` após falhas consecutivas. Webhooks que falham repetidamente são silenciosos.

**Critérios de aceitação:**

- Após N falhas consecutivas no mesmo webhook (N = 3, configurável), enviar email de alerta ao owner da organização
- Email inclui: payload resumido, tipo de evento, número de tentativas, último erro
- Contador de alertas enviados para evitar spam (máximo 1 alerta por webhook por hora)

---

## EP-4 — Organização de Arquivos

### T-12 — Consolidar diretório `src/server/`

**Prioridade:** Baixa
**Esforço:** Baixo

O diretório `src/server/auth/` e `src/server/organization/` ficam fora do padrão de organização. Além disso, `src/server/organization/` tem arquivos duplicados com nomes diferentes (`getCurrentOrganizationId.ts` e `get-current-organization-id.ts`).

**Critérios de aceitação:**

- Duplicatas em `src/server/organization/` removidas (manter apenas a versão kebab-case)
- Avaliar mover `src/server/auth/` para `src/lib/auth/server/` para co-localizar com `src/lib/auth/`
- Atualizar todos os imports após mover
- Build e lint passam

---

## Resumo por Prioridade

### Fazer primeiro (alta prioridade)

| ID   | Item                                              | Esforço |
| ---- | ------------------------------------------------- | ------- |
| T-01 | Extrair lógica de negócio de tickets para service | Médio   |
| T-02 | Dividir componentes >400 linhas                   | Alto    |
| T-05 | Cache de leads para Redis                         | Baixo   |
| T-06 | Rotação de chaves de criptografia                 | Médio   |
| T-10 | Email de convite de equipe                        | Baixo   |

### Fazer em seguida (média prioridade)

| ID   | Item                       | Esforço |
| ---- | -------------------------- | ------- |
| T-03 | Zod em query params        | Baixo   |
| T-04 | Padronizar formato de erro | Baixo   |
| T-07 | Audit log organizacional   | Médio   |
| T-11 | Alertas de falha webhook   | Baixo   |

### Backlog (baixa prioridade)

| ID   | Item                    | Esforço |
| ---- | ----------------------- | ------- |
| T-08 | Rate limit Centrifugo   | Mínimo  |
| T-09 | Race condition leads    | Mínimo  |
| T-12 | Reorganizar src/server/ | Baixo   |

---

## O que NÃO está neste PRD

Os itens abaixo foram resolvidos antes do MVP e não precisam de ação:

- ✅ Env vars sem fallback trivial (CRON_SECRET, META_API_VERSION, etc.)
- ✅ OAuth Meta Ads CSRF protection via Redis state token
- ✅ Rate limiting fail-secure quando Redis cair
- ✅ Guard de membership em meta-ads/ad-accounts
- ✅ Webhook WhatsApp com Zod no GET e early return explícito
- ✅ Precedência de organizationId: sessão > header
- ✅ .env.example criado
- ✅ META_GRAPH_API_VERSION eliminado (consolidado em META_API_VERSION)
- ✅ Tokens Meta Ads criptografados com AES-256-GCM (já estava implementado)

---

_PRD gerado em 2026-02-23 com base em AUDIT_MVP_2026-02-23.md_
