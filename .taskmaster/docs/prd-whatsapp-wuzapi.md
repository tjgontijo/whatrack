# PRD: WhatsApp WuzAPI Module

## Overview

Modulo de integracao com WuzAPI para conexao de WhatsApp no Whatrack. WuzAPI e um servidor self-hosted que permite conexao via QR Code/Pairing Code.

## Caracteristicas do Provider

| Aspecto | Descricao |
|---------|-----------|
| **Tipo** | Self-hosted (Docker) |
| **Autenticacao** | QR Code / Pairing Code |
| **Sessao** | Pode desconectar, requer reconexao |
| **Controle** | Total (seu servidor) |
| **Custo** | Infraestrutura propria |

## Escopo

### Implementar
- Conexao via QR Code
- Conexao via Pairing Code
- Envio de mensagens (texto, midia)
- Recebimento de mensagens via webhook
- Health check do servidor
- Gerenciamento de instancias (criar, deletar)

### Nao Implementar
- Interface abstrata compartilhada com outros providers
- UI admin para configuracao (via ENV por enquanto)

## Estrutura do Modulo

```
src/services/whatsapp/uuzapi/
├── config.ts           # Configuracao (ENV vars)
├── client.ts           # HTTP client para WuzAPI
├── create-instance.ts  # POST /admin/users
├── delete-instance.ts  # DELETE /admin/users/{id}/full
├── connect-instance.ts # POST /session/connect
├── get-status.ts       # GET /session/status
├── get-qrcode.ts       # GET /session/qr
├── get-paircode.ts     # POST /session/pairphone
├── logout-instance.ts  # POST /session/logout
├── send-message.ts     # POST /chat/send/text
├── provision-webhook.ts# POST /webhook
├── parse-webhook.ts    # Normalizar payload do webhook
└── index.ts            # Barrel exports
```

## Environment Variables

```env
# WuzAPI Server
WUZAPI_BASE_URL=http://localhost:8080
WUZAPI_ADMIN_TOKEN=seu_token_admin

# Webhook
WHATSAPP_WEBHOOK_BASE_URL=https://whatrack.com/api/v1/whatsapp/uebhook
```

## Endpoints WuzAPI

| Funcionalidade | Metodo | Endpoint | Header |
|----------------|--------|----------|--------|
| Health | GET | /health | - |
| Criar user | POST | /admin/users | Authorization: {adminToken} |
| Deletar user | DELETE | /admin/users/{id}/full | Authorization: {adminToken} |
| Conectar | POST | /session/connect | token: {userToken} |
| Status | GET | /session/status | token: {userToken} |
| QR Code | GET | /session/qr | token: {userToken} |
| Pairing | POST | /session/pairphone | token: {userToken} |
| Logout | POST | /session/logout | token: {userToken} |
| Config Webhook | POST | /webhook | token: {userToken} |
| Enviar texto | POST | /chat/send/text | token: {userToken} |
| Enviar imagem | POST | /chat/send/image | token: {userToken} |
| Enviar documento | POST | /chat/send/document | token: {userToken} |

## Fluxo de Conexao

```
1. Usuario clica "Conectar WhatsApp"
2. Backend chama POST /session/connect
3. Se nao conectado, chama GET /session/qr
4. Frontend exibe QR Code
5. Usuario escaneia com celular
6. WuzAPI envia webhook de conexao
7. Backend atualiza status para "connected"
8. Backend configura webhook automaticamente
```

## Formato do Webhook (Recebido)

```typescript
// Mensagem recebida
{
  event: "Message",
  data: {
    Info: {
      ID: "msg_id",
      RemoteJid: "5511999999999@s.whatsapp.net",
      FromMe: false,
      Type: "text"
    },
    Text: "Conteudo da mensagem"
  }
}

// Conexao
{
  event: "Connected",
  jid: "5511999999999@s.whatsapp.net"
}

// Desconexao
{
  event: "LoggedOut"
}
```

## Implementacao

### config.ts

```typescript
export interface WuzapiConfig {
  baseUrl: string
  adminToken: string
}

export function getWuzapiConfig(): WuzapiConfig {
  const baseUrl = process.env.WUZAPI_BASE_URL?.replace(/\/$/, '')
  const adminToken = process.env.WUZAPI_ADMIN_TOKEN

  if (!baseUrl) throw new Error('WUZAPI_BASE_URL is not configured')
  if (!adminToken) throw new Error('WUZAPI_ADMIN_TOKEN is not configured')

  return { baseUrl, adminToken }
}
```

### create-instance.ts

```typescript
import { prisma } from '@/lib/prisma'
import { getWuzapiConfig } from './config'

export async function createWuzapiInstance({
  organizationId,
  name,
  phone,
}: {
  organizationId: string
  name: string
  phone: string
}) {
  const { baseUrl, adminToken } = getWuzapiConfig()

  const response = await fetch(`${baseUrl}/admin/users`, {
    method: 'POST',
    headers: {
      'Authorization': adminToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      token: crypto.randomUUID(),
    }),
  })

  if (!response.ok) {
    throw new Error(`WuzAPI error: ${response.status}`)
  }

  const payload = await response.json()

  const instance = await prisma.whatsappInstance.upsert({
    where: {
      organizationId_instanceId: {
        organizationId,
        instanceId: payload.data.id,
      },
    },
    update: {
      label: name,
      phone,
      token: payload.data.token,
    },
    create: {
      organizationId,
      instanceId: payload.data.id,
      label: name,
      phone,
      token: payload.data.token,
      provider: 'wuzapi',
    },
  })

  return instance
}
```

### connect-instance.ts

```typescript
import { prisma } from '@/lib/prisma'
import { getWuzapiConfig } from './config'
import { provisionWuzapiWebhook } from './provision-webhook'

export async function connectWuzapiInstance({
  instanceId,
  organizationId,
  phone,
}: {
  instanceId: string
  organizationId: string
  phone?: string
}) {
  const instance = await prisma.whatsappInstance.findUnique({
    where: {
      organizationId_instanceId: { organizationId, instanceId },
    },
  })

  if (!instance?.token) {
    throw new Error('Instance or token not found')
  }

  const { baseUrl } = getWuzapiConfig()

  // 1. Tenta conectar
  const connectRes = await fetch(`${baseUrl}/session/connect`, {
    method: 'POST',
    headers: {
      'token': instance.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ Subscribe: 'All', Immediate: false }),
  })

  const connectData = await connectRes.json()

  // 2. Se ja conectado
  if (connectData.data?.jid) {
    return {
      status: 'connected',
      jid: connectData.data.jid,
    }
  }

  // 3. Busca QR Code
  const qrRes = await fetch(`${baseUrl}/session/qr`, {
    headers: { 'token': instance.token },
  })
  const qrData = await qrRes.json()

  // 4. Provisiona webhook (fire-and-forget)
  provisionWuzapiWebhook({ organizationId, instanceId }).catch(console.error)

  return {
    status: 'waiting_qr',
    qr: qrData.data?.QRCode || null,
    pairCode: null,
  }
}
```

## API Routes

As rotas existentes em `/api/v1/whatsapp/*` serao atualizadas para usar este modulo:

```typescript
// src/app/api/v1/whatsapp/instances/route.ts
import { createWuzapiInstance } from '@/services/whatsapp/uuzapi'

export async function POST(request: Request) {
  // ... validacao
  const instance = await createWuzapiInstance({
    organizationId,
    name: parsed.data.name,
    phone: parsed.data.phone,
  })
  return NextResponse.json(instance, { status: 201 })
}
```

## Migracao de UAZAPI

O codigo atual usa UAZAPI. As diferencas principais:

| Aspecto | UAZAPI | WuzAPI |
|---------|--------|--------|
| Criar | POST /instance/init | POST /admin/users |
| Header admin | admintoken | Authorization |
| Header user | token | token |
| Conectar | POST /instance/connect | POST /session/connect |
| Estrutura resposta | instance.id | data.id |

A migracao envolve:
1. Criar novo modulo `wuzapi/`
2. Atualizar API routes para usar novo modulo
3. Manter modulo `uazapi/` para instancias existentes
4. Campo `provider` na tabela indica qual usar

## Riscos e Mitigacoes

### WuzAPI fora do ar
- Health check periodico
- Logs detalhados
- Retry com backoff

### Breaking changes
- Manter ambos modulos durante transicao
- Campo `provider` determina qual usar
- Testes antes de deploy

## Tasks

1. Criar `src/services/whatsapp/uuzapi/config.ts`
2. Criar `src/services/whatsapp/uuzapi/create-instance.ts`
3. Criar `src/services/whatsapp/uuzapi/connect-instance.ts`
4. Criar `src/services/whatsapp/uuzapi/get-status.ts`
5. Criar `src/services/whatsapp/uuzapi/logout-instance.ts`
6. Criar `src/services/whatsapp/uuzapi/delete-instance.ts`
7. Criar `src/services/whatsapp/uuzapi/provision-webhook.ts`
8. Criar `src/services/whatsapp/uuzapi/parse-webhook.ts`
9. Criar `src/services/whatsapp/uuzapi/index.ts`
10. Atualizar API routes para usar novo modulo
11. Testar fluxo completo
