# PRD: WhatsApp Onboarding v2 (Coexistence + Tracking Code)

## 1. Objetivo

Refatorar o fluxo atual de onboarding WhatsApp para usar a **abordagem de tracking code com webhook** em vez do fluxo baseado em `postMessage`. Isso elimina a dependência de popup redirects e permite rastreamento seguro de qual organização está se conectando via `sessionInfo` nos extras.

**Benefícios:**
- ✅ Melhor rastreamento: cada org tem seu próprio tracking code
- ✅ Mais seguro: IDs internos não ficam expostos na URL
- ✅ Mais robusto: webhook é a fonte da verdade, não popup redirect
- ✅ Suporta coexistence mode adequadamente
- ✅ Auditoria completa de tentativas de onboarding

---

## 2. Diagrama do fluxo (novo)

```
Frontend                          Backend                      Meta
   |                                |                           |
   |--1. Clica "Conectar"---------->| POST /onboarding-url       |
   |                                |                            |
   |                                |--2. Gera tracking code---->|
   |                                |   Salva em Redis           |
   |                                |   Calcula extras JSON      |
   |                                |   com sessionInfo          |
   |                                |                            |
   |<--3. Retorna URL com extras----|                            |
   |                                |                            |
   |--4. window.open() para Meta----|                      Abre iframe
   |                                |                      (Embedded Signup)
   |                                |                            |
   |                    [Cliente completa QR code + sync]        |
   |                                |                            |
   |                                |<--5. POST webhook---------|
   |                                |    event: PARTNER_ADDED    |
   |                                |    sessionInfo.trackingCode|
   |                                |                            |
   |                                |--6. Busca tracking code    |
   |                                |   Identifica organization  |
   |                                |   Salva WABA + org mapping |
   |                                |   Cleanup Redis            |
   |                                |                            |
   |<--7. Real-time update (polling ou socket)                   |
   |    whatsapp.connected = true                                |
   |                                |                            |
```

---

## 3. Mudanças principais

### 3.1 Novo endpoint: `GET /api/v1/whatsapp/onboarding-url`

**Responsabilidade:** Gerar URL de onboarding com tracking code

**Autenticação:** Bearer token (requer `activeOrganizationId`)

**Query params:** (opcional)
- `redirectPath` (padrão: `/dashboard/settings/whatsapp`)

**Request:**
```bash
GET /api/v1/whatsapp/onboarding-url?redirectPath=/my-redirect
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "url": "https://business.facebook.com/messaging/whatsapp/onboard/?app_id=...&config_id=...&extras=%7B...%7D",
  "trackingCode": "550e8400-e29b-41d4-a716-446655440000",
  "expiresAt": "2025-02-17T12:00:00Z"
}
```

**Response (401):**
```json
{ "error": "Unauthorized - missing organization" }
```

**Fluxo interno:**
1. Extrai `organizationId` do bearer token
2. Gera `trackingCode` = `crypto.randomUUID()`
3. Salva em Redis:
   ```
   Key: whatsapp:onboarding:{trackingCode}
   Value: {
     organizationId: "org-123",
     createdAt: 1708169000,
     redirectPath: "/dashboard/settings/whatsapp"
   }
   TTL: 86400 (24 horas)
   ```
4. Monta `extras` JSON:
   ```json
   {
     "featureType": "whatsapp_business_app_onboarding",
     "sessionInfoVersion": "3",
     "version": "v3",
     "sessionInfo": {
       "trackingCode": "550e8400-..."
     }
   }
   ```
5. Codifica e cria URL com `app_id` e `config_id`
6. Retorna URL + tracking code + expiration

---

### 3.2 Modificação: Webhook `POST /api/v1/whatsapp/webhook`

**Mudanças:**
- Processa evento `account_update` com `event === 'PARTNER_ADDED'`
- Extrai `sessionInfo.trackingCode` do payload
- Busca organização via Redis usando tracking code
- Cria/atualiza registro de conexão WhatsApp

**Novo fluxo (código-chave):**

```typescript
export async function POST(request: Request) {
  const body = await request.json();
  
  // Validar assinatura
  const signature = request.headers.get('x-hub-signature-256');
  if (!validateSignature(body, signature)) {
    return Response.json({ error: 'Invalid signature' }, { status: 403 });
  }

  // Iterar changes
  for (const entry of body.entry) {
    for (const change of entry.changes) {
      if (change.field === 'account_update') {
        const value = change.value;

        // ⭐ Caso 1: PARTNER_ADDED (Onboarding completo)
        if (value.event === 'PARTNER_ADDED') {
          const trackingCode = value.sessionInfo?.trackingCode;

          if (!trackingCode) {
            console.warn('PARTNER_ADDED sem trackingCode:', value);
            continue; // Skip silenciosamente
          }

          // Busca org no Redis
          const onboardingData = await redis.get(
            `whatsapp:onboarding:${trackingCode}`
          );

          if (!onboardingData) {
            console.error(
              `Tracking code expirado/inválido: ${trackingCode}`
            );
            continue; // Já expirou, skip
          }

          const { organizationId, createdAt } = JSON.parse(onboardingData);

          // Cria registro de conexão
          await db.whatsappConnections.upsert(
            { organizationId, wabaId: value.waba_info.waba_id },
            {
              $set: {
                organizationId,
                wabaId: value.waba_info.waba_id,
                ownerBusinessId: value.waba_info.owner_business_id,
                status: 'connected',
                connectedAt: new Date(),
                trackingCodeUsed: trackingCode,
              }
            }
          );

          // Atualiza organization.whatsappStatus
          await db.organizations.updateOne(
            { id: organizationId },
            {
              $set: {
                whatsapp: {
                  status: 'connected',
                  connectedAt: new Date(),
                }
              }
            }
          );

          // Cleanup Redis
          await redis.del(`whatsapp:onboarding:${trackingCode}`);

          // Log para auditoria
          await db.auditLog.create({
            organizationId,
            action: 'WHATSAPP_CONNECTED',
            metadata: { wabaId: value.waba_info.waba_id },
            timestamp: new Date(),
          });

          console.log(
            `✅ Org ${organizationId} conectada (WABA: ${value.waba_info.waba_id})`
          );
        }

        // ⭐ Caso 2: PARTNER_REMOVED (Desconexão)
        if (value.event === 'PARTNER_REMOVED') {
          const wabaId = value.waba_info.waba_id;

          const conn = await db.whatsappConnections.findOne({ wabaId });
          if (conn) {
            await db.whatsappConnections.updateOne(
              { wabaId },
              { $set: { status: 'disconnected', disconnectedAt: new Date() } }
            );

            await db.organizations.updateOne(
              { id: conn.organizationId },
              {
                $set: {
                  whatsapp: {
                    status: 'disconnected',
                    disconnectedAt: new Date(),
                  }
                }
              }
            );

            console.log(`❌ Org ${conn.organizationId} desconectada`);
          }
        }
      }

      // Processar messages (já existente)
      if (change.field === 'messages') {
        await processMessages(change.value);
      }
    }
  }

  return Response.json({ received: true });
}
```

---

### 3.3 Deletar/desativar fluxo antigo

**Remover:**
- POST `/api/v1/whatsapp/claim-waba` (substitui pelo webhook)
- Lógica de `postMessage` do popup em `use-whatsapp-onboarding.ts`
- Validação de `state` em `sessionStorage`
- Escuta de `WA_EMBEDDED_SIGNUP` no frontend

**Simplificar:**
- `MetaCloudService.exchangeCodeForToken()` → **será chamado apenas no webhook**
- `embedded-signup-button.tsx` → apenas abre URL (sem popup listeners)

---

## 4. Alterações no banco de dados

### 4.1 Nova tabela: `whatsapp_onboarding_tracking`

(Opcional se usar Redis, mas recomendo para auditoria)

```sql
CREATE TABLE whatsapp_onboarding_tracking (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  tracking_code UUID NOT NULL UNIQUE,
  status ENUM('pending', 'completed', 'expired', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  webhook_received_at TIMESTAMP,
  waba_id VARCHAR(255),
  webhook_payload JSONB,
  deleted_at TIMESTAMP,
  
  INDEX(organization_id),
  INDEX(tracking_code),
  INDEX(expires_at)
);
```

### 4.2 Nova tabela: `whatsapp_connections`

```sql
CREATE TABLE whatsapp_connections (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  waba_id VARCHAR(255) NOT NULL UNIQUE,
  owner_business_id VARCHAR(255),
  status ENUM('connected', 'disconnected', 'expired') DEFAULT 'connected',
  tracking_code_used UUID REFERENCES whatsapp_onboarding_tracking(tracking_code),
  connected_at TIMESTAMP,
  disconnected_at TIMESTAMP,
  last_webhook_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX(organization_id),
  INDEX(waba_id),
  INDEX(status)
);
```

### 4.3 Alterar tabela: `organizations`

Adicionar coluna (se não existir):
```sql
ALTER TABLE organizations
ADD COLUMN whatsapp JSONB DEFAULT '{"status": "disconnected"}';
```

---

## 5. Frontend changes

### 5.1 Novo hook: `useWhatsAppOnboardingV2`

```typescript
// src/hooks/whatsapp/use-whatsapp-onboarding-v2.ts

import { useState } from 'react';
import { api } from '@/lib/api';

export function useWhatsAppOnboardingV2() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startOnboarding = async (redirectPath = '/dashboard/settings/whatsapp') => {
    setLoading(true);
    setError(null);

    try {
      // 1. Get onboarding URL com tracking code
      const response = await api.get('/v1/whatsapp/onboarding-url', {
        params: { redirectPath }
      });

      const { url } = response.data;

      // 2. Open URL (pode ser modal ou window.open)
      window.open(url, 'whatsapp_onboarding', 'width=500,height=700');

      // 3. Poll para verificar se webhook chegou
      startPollingForConnection();

    } catch (err) {
      setError(err.message || 'Erro ao gerar URL de onboarding');
    } finally {
      setLoading(false);
    }
  };

  const startPollingForConnection = () => {
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get('/v1/whatsapp/check-connection');
        if (data.connected) {
          clearInterval(interval);
          // Trigger refetch das phone numbers
          window.dispatchEvent(new CustomEvent('whatsapp-connected'));
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000); // Check a cada 2 segundos

    // Cleanup após 5 minutos
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  };

  return { startOnboarding, loading, error };
}
```

### 5.2 Simplificar `EmbeddedSignupButton`

```typescript
// src/components/whatsapp/embedded-signup-button.tsx

import { useWhatsAppOnboardingV2 } from '@/hooks/whatsapp/use-whatsapp-onboarding-v2';

export function EmbeddedSignupButton() {
  const { startOnboarding, loading, error } = useWhatsAppOnboardingV2();

  return (
    <div>
      <button
        onClick={() => startOnboarding()}
        disabled={loading}
      >
        {loading ? 'Abrindo...' : 'Conectar com Meta'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

---

## 6. Detalhes técnicos

### 6.1 Structure de `extras` JSON

```json
{
  "featureType": "whatsapp_business_app_onboarding",
  "sessionInfoVersion": "3",
  "version": "v3",
  "sessionInfo": {
    "trackingCode": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Encoding:**
```typescript
const extras = { ... };
const encoded = encodeURIComponent(JSON.stringify(extras));
// Resultado: extras=%7B%22featureType%22%3A...
```

### 6.2 URL final gerada

```
https://business.facebook.com/messaging/whatsapp/onboard/
  ?app_id=1531656324571133
  &config_id=1410410867548573
  &extras=%7B%22featureType%22%3A%22whatsapp_business_app_onboarding%22%2C%22sessionInfoVersion%22%3A%223%22%2C%22version%22%3A%22v3%22%2C%22sessionInfo%22%3A%7B%22trackingCode%22%3A%22550e8400-e29b-41d4-a716-446655440000%22%7D%7D
```

### 6.3 Payload do webhook esperado

```json
{
  "entry": [
    {
      "id": "364015407714967",
      "time": 1771201225,
      "changes": [
        {
          "field": "account_update",
          "value": {
            "event": "PARTNER_ADDED",
            "waba_info": {
              "waba_id": "26205485689057417",
              "owner_business_id": "793757329383127"
            },
            "sessionInfo": {
              "trackingCode": "550e8400-e29b-41d4-a716-446655440000"
            }
          }
        }
      ]
    }
  ],
  "object": "whatsapp_business_account"
}
```

---

## 7. Tratamento de erros

### 7.1 Tracking code expirado

**Quando:** Webhook chega mas tracking code não existe em Redis

**Ação:**
- Log: `error` (auditoria importante)
- Resposta webhook: `200 OK` (Meta não deve retornar)
- Usuario: Ver erro "Sessão expirou, tente novamente"
- Solução: Gerar nova URL de onboarding

### 7.2 Webhook sem trackingCode

**Quando:** Evento `PARTNER_ADDED` sem `sessionInfo.trackingCode`

**Ação:**
- Log: `warn`
- Webhook silencioso (skip)
- Provável causa: cliente conectou sem passar por seu SaaS

### 7.3 Falha ao salvar no DB

**Quando:** Redis delete funciona mas DB insert falha

**Ação:**
- Log: `error` com stack trace
- Retorna 500 para Meta (ela vai reenviar webhook)
- Implementar circuit breaker para não sobrecarregar

---

## 8. Endpoints afetados

### 8.1 Novos

- `GET /api/v1/whatsapp/onboarding-url` ← **Principal**
- `POST /api/v1/whatsapp/webhook` ← **Modificado**

### 8.2 Mantém funcionalidade

- `GET /api/v1/whatsapp/check-connection` (sem mudanças)
- `GET /api/v1/whatsapp/phone-numbers` (sem mudanças)

### 8.3 Deprecados (remover em v2.1)

- `POST /api/v1/whatsapp/claim-waba` ← **Remover**

---

## 9. Migration da implementação existente

### 9.1 Fase 1: Deploy (1-2 dias)

- [ ] Criar tabelas no DB
- [ ] Implementar `GET /onboarding-url`
- [ ] Modificar webhook para processar `PARTNER_ADDED`
- [ ] Criar `useWhatsAppOnboardingV2`
- [ ] Deploy com feature flag `WHATSAPP_V2_ONBOARDING=false`

### 9.2 Fase 2: Teste (2-3 dias)

- [ ] Testar fluxo end-to-end com org de teste
- [ ] Validar Redis key expiration
- [ ] Validar polling de status
- [ ] Testar timeout de 24h
- [ ] Validar auditoria no DB

### 9.3 Fase 3: Rollout (1 dia)

- [ ] Enable feature flag: `WHATSAPP_V2_ONBOARDING=true`
- [ ] Manter v1 como fallback por 1 semana
- [ ] Monitor erros no Sentry
- [ ] Remover v1 após validação

---

## 10. Checklist de implementação

- [ ] Criar `src/app/api/v1/whatsapp/onboarding-url/route.ts`
- [ ] Modificar `src/app/api/v1/whatsapp/webhook/route.ts`
- [ ] Criar `src/hooks/whatsapp/use-whatsapp-onboarding-v2.ts`
- [ ] Simplificar `src/components/whatsapp/embedded-signup-button.tsx`
- [ ] Atualizar `src/app/dashboard/settings/whatsapp/page.tsx`
- [ ] Criar migrations DB (tabelas novas)
- [ ] Adicionar Redis client se não existir
- [ ] Testes unitários dos endpoints
- [ ] Testes de integração (webhook)
- [ ] Documentação no Notion/Wiki
- [ ] Deploy + monitoring

---

## 11. Variáveis de ambiente necessárias

```env
# Existentes (manter)
NEXT_PUBLIC_META_APP_ID=1531656324571133
NEXT_PUBLIC_META_CONFIG_ID=1410410867548573
META_APP_SECRET=xxx
META_WEBHOOK_VERIFY_TOKEN=xxx

# Novo
WHATSAPP_ONBOARDING_TTL=86400  # 24 horas em segundos
WHATSAPP_V2_ONBOARDING=true    # Feature flag

# Redis (se não existir)
REDIS_URL=redis://localhost:6379
```

---

## 12. Success Metrics

✅ Onboarding completa em < 2 minutos (antes: ~5 min com postMessage)
✅ Taxa de erro < 1% (antes: ~5% por popup bloqueado)
✅ 100% rastreabilidade de qual org está onboarding
✅ Zero dependência de popup redirects
✅ Suporte completo a coexistence mode

---

## Apêndice A: Comparison (v1 vs v2)

| Aspecto | v1 (atual) | v2 (novo) |
|---------|-----------|----------|
| Fluxo | postMessage + redirect | webhook + tracking code |
| Rastreamento | Baseado em popup state | Redis + DB |
| Segurança | State em sessionStorage | UUID em Redis com TTL |
| Confiabilidade | Depende de popup | Webhook é fonte da verdade |
| Popup bloqueado | ❌ Falha silenciosa | ✅ OK (URL pode reabrir) |
| Coexistence | ⚠️ Suporte parcial | ✅ Suporte completo |
| Auditoria | Mínima | ✅ Completa |
| TTL de sessão | Indefinido | ✅ 24h |

