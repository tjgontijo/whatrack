# PRD: WhatsApp Integration — Security Hardening & Missing Features

> **Status:** Em implementação  
> **Prioridade:** Alta  
> **Data:** 2026-02-15  
> **Ref:** [whatsapp-onboarding-spec.md](./whatsapp-onboarding-spec.md)

---

## 1. Contexto

A integração WhatsApp via Embedded Signup está funcional, mas a auditoria do spec identificou **5 gaps críticos** que precisam ser resolvidos antes de ir para produção:

| # | Gap | Risco | Severidade |
|---|-----|-------|------------|
| 1 | Webhook sem verificação de assinatura (`X-Hub-Signature-256`) | Payloads podem ser forjados por qualquer atacante | 🔴 Crítico |
| 2 | OAuth sem proteção CSRF (nonce no `state`) | Ataques CSRF podem vincular WABAs de terceiros | 🔴 Crítico |
| 3 | Access tokens armazenados em texto puro | Vazamento do DB expõe tokens | 🟡 Alto |
| 4 | Sem mecanismo de refresh/monitoramento de token | Mensagens param de funcionar silenciosamente após ~60 dias | 🟡 Alto |
| 5 | Sem fluxo de desconexão | Usuário não consegue desvincular WABA | 🟠 Médio |

---

## 2. Escopo de Implementação

### 2.1 — Webhook Signature Verification

**O quê:** Validar o header `X-Hub-Signature-256` em todos os webhooks POST usando HMAC-SHA256 com `META_APP_SECRET`.

**Arquivos:**
- `src/lib/whatsapp/webhook-signature.ts` _(novo)_ — utilitário de verificação
- `src/app/api/v1/whatsapp/webhook/route.ts` — integrar verificação

**Lógica:**
1. Ler o body como raw text (antes de parsear JSON)
2. Computar `HMAC-SHA256(body, META_APP_SECRET)` 
3. Comparar com o valor do header `X-Hub-Signature-256` (formato: `sha256=<hex>`)
4. Usar comparação timing-safe (`timingSafeEqual`)
5. Rejeitar com 401 se não bater

### 2.2 — CSRF Protection (OAuth State Nonce)

**O quê:** Gerar um nonce criptográfico, incluí-lo no `state` param do OAuth, e validar no callback.

**Arquivos:**
- `src/hooks/whatsapp/use-whatsapp-onboarding.ts` — gerar e enviar nonce
- `src/app/dashboard/settings/whatsapp/page.tsx` — validar nonce no callback

**Lógica:**
1. Gerar `crypto.randomUUID()` no frontend
2. Salvar no `sessionStorage` com key `wa_oauth_nonce`
3. Enviar como parte do `state` param: `state={nonce}:{orgId}` 
4. No callback, validar que o nonce bate com o salvo
5. Limpar nonce do `sessionStorage` após uso

### 2.3 — Token Encryption at Rest

**O quê:** Criptografar `accessToken` antes de salvar no banco e descriptografar ao ler.

**Arquivos:**
- `src/lib/whatsapp/token-crypto.ts` _(novo)_ — encrypt/decrypt com AES-256-GCM
- `src/services/whatsapp/meta-cloud.service.ts` — usar encrypt/decrypt
- `src/app/api/v1/whatsapp/claim-waba/route.ts` — criptografar antes de salvar
- `.env` — nova variável `TOKEN_ENCRYPTION_KEY`

**Lógica:**
1. Usar `AES-256-GCM` com IV aleatório por token
2. Output: `{iv}:{authTag}:{ciphertext}` (tudo em hex)
3. Criptografar no `claim-waba` antes do `upsert`
4. Descriptografar em todo lugar que lê `accessToken` do banco

**Schema Prisma:**
- Adicionar campo `accessTokenEncrypted Boolean @default(false)` no `WhatsAppConfig`

### 2.4 — Token Health Monitoring

**O quê:** Verificar periodicamente se os tokens ainda são válidos e alertar quando estiverem próximos de expirar.

**Arquivos:**
- `src/app/api/v1/whatsapp/token-health/route.ts` _(novo)_ — endpoint para verificar saúde dos tokens
- `src/services/whatsapp/meta-cloud.service.ts` — método `debugToken()`

**Lógica:**
1. Endpoint `GET /api/v1/whatsapp/token-health` verifica tokens da organização
2. Chama `GET /debug_token?input_token={token}` no Meta Graph API
3. Retorna status: `valid`, `expiring_soon` (< 7 dias), `expired`, `invalid`
4. Atualiza `tokenExpiresAt` no banco com dados reais da Meta
5. Atualiza `status` do `WhatsAppConfig` se token estiver expirado

### 2.5 — Disconnect Flow (Desconexão)

**O quê:** Permitir que o usuário desconecte um WABA de forma limpa.

**Arquivos:**
- `src/app/api/v1/whatsapp/disconnect/route.ts` _(novo)_ — endpoint de desconexão
- `src/components/whatsapp/instance-card.tsx` — botão de desconectar

**Lógica:**
1. Chamar `DELETE /{wabaId}/subscribed_apps` na Meta para remover webhooks
2. Atualizar `WhatsAppConfig.status` para `disconnected`
3. Limpar `accessToken` do banco
4. Manter o registro para histórico (soft delete)

---

## 3. Alterações no Schema Prisma

```prisma
model WhatsAppConfig {
  // ... campos existentes ...
  
  // NOVOS CAMPOS
  accessTokenEncrypted Boolean   @default(false)  // Indica se o token está criptografado
  disconnectedAt       DateTime?                  // Quando foi desconectado
  disconnectedBy       String?                    // User ID que desconectou  
  tokenLastCheckedAt   DateTime?                  // Última verificação de saúde do token
  tokenStatus          String?                    // valid, expiring_soon, expired, invalid
}
```

---

## 4. Novas Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `TOKEN_ENCRYPTION_KEY` | Chave AES-256 (32 bytes hex) | `openssl rand -hex 32` |

---

## 5. Ordem de Implementação

1. ✅ **Webhook Signature** — mais crítico, protege contra payloads forjados
2. ✅ **CSRF Nonce** — protege o fluxo OAuth
3. ✅ **Token Encryption** — protege dados em repouso
4. ✅ **Token Health** — monitoramento proativo
5. ✅ **Disconnect Flow** — funcionalidade essencial para UX

---

## 6. Critérios de Aceitação

- [ ] Webhooks com assinatura inválida retornam 401
- [ ] OAuth state inclui nonce e é validado no callback
- [ ] Tokens no banco estão criptografados (campo `accessTokenEncrypted = true`)
- [ ] Endpoint `/token-health` retorna status correto para cada token
- [ ] Usuário consegue desconectar um WABA pela UI
- [ ] Build passa sem erros
- [ ] Funcionalidades existentes continuam operando normalmente
