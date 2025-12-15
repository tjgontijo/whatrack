# PRD: WhatsApp UAZAPI Module

## Overview

Modulo de integracao com UAZAPI para conexao de WhatsApp no Whatrack. UAZAPI e um servico externo (SaaS) que permite conexao via QR Code/Pairing Code.

**Status**: Implementado (codigo atual)

## Caracteristicas do Provider

| Aspecto | Descricao |
|---------|-----------|
| **Tipo** | SaaS externo |
| **Autenticacao** | QR Code / Pairing Code |
| **Sessao** | Pode desconectar, requer reconexao |
| **Controle** | Limitado (servidor de terceiros) |
| **Custo** | Assinatura do servico |

## Escopo

### Implementado
- Conexao via QR Code
- Envio de mensagens (texto)
- Recebimento de mensagens via webhook
- Gerenciamento de instancias (criar, deletar, listar)
- Provisao automatica de webhook

### Nao Implementado
- Pairing Code
- Envio de midia
- Health check

## Estrutura do Modulo (Atual)

```
src/services/whatsapp/uazapi/
├── config.ts           # Configuracao (ENV vars)
├── create-instance.ts  # POST /instance/init
├── delete-instance.ts  # DELETE /instance/{id}
├── connect-instance.ts # POST /instance/connect
├── get-instance.ts     # GET /instance/{id}
├── get-instance-status.ts # Via list-instances
├── list-instances.ts   # GET /instance/all
├── logout-instance.ts  # POST /instance/logout
├── send-message.ts     # POST /send/text
├── provision-webhook.ts# POST /webhook
├── update-webhook.ts   # PUT /webhook
├── check.ts            # Validacao de numero
└── index.ts            # Barrel exports
```

## Environment Variables

```env
# UAZAPI Server
UAZAPI_BASE_URL=https://api.uazapi.com
UAZAPI_ADMIN_TOKEN=seu_token_admin
```

## Endpoints UAZAPI

| Funcionalidade | Metodo | Endpoint | Header |
|----------------|--------|----------|--------|
| Criar | POST | /instance/init | admintoken |
| Listar | GET | /instance/all | admintoken |
| Deletar | DELETE | /instance/{id} | admintoken |
| Conectar | POST | /instance/connect | token |
| Status | GET | /instance/status | token |
| Logout | POST | /instance/logout | token |
| Config Webhook | POST | /webhook | token |
| Enviar texto | POST | /send/text | token |

## Fluxo de Conexao (Atual)

```
1. Usuario clica "Conectar WhatsApp"
2. Backend chama POST /instance/connect
3. Resposta inclui QR Code
4. Frontend exibe QR Code
5. Usuario escaneia com celular
6. Frontend faz polling de status
7. Quando conectado, atualiza UI
8. Backend configura webhook automaticamente (fire-and-forget)
```

## Formato do Webhook (Recebido)

```typescript
{
  EventType: "messages",
  instanceName: "instance_id",
  owner: "instance_id",
  token: "instance_token",
  chat: {
    id: "chat_id",
    name: "Contact Name",
    phone: "5511999999999",
    wa_chatid: "5511999999999@s.whatsapp.net",
  },
  message: {
    chatid: "5511999999999@s.whatsapp.net",
    fromMe: false,
    id: "msg_id",
    messageType: "text",
    text: "Conteudo da mensagem",
  }
}
```

## Codigo Existente

### config.ts

```typescript
export type UazapiConfig = {
  baseUrl: string
  adminToken: string
}

export function getUazapiConfig(): UazapiConfig {
  const baseUrl = process.env.UAZAPI_BASE_URL?.replace(/\/$/, '')
  const adminToken = process.env.UAZAPI_ADMIN_TOKEN

  if (!baseUrl) throw new Error('UAZAPI_BASE_URL is not configured')
  if (!adminToken) throw new Error('UAZAPI_ADMIN_TOKEN is not configured')

  return { baseUrl, adminToken }
}
```

### create-instance.ts

```typescript
// POST /instance/init
const response = await fetch(`${baseUrl}/instance/init`, {
  method: 'POST',
  headers: {
    'admintoken': adminToken,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ name, systemName }),
})
```

### connect-instance.ts

```typescript
// POST /instance/connect
const response = await fetch(`${baseUrl}/instance/connect`, {
  method: 'POST',
  headers: {
    'token': instance.token,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
})
```

## Diferencas vs WuzAPI

| Aspecto | UAZAPI | WuzAPI |
|---------|--------|--------|
| Tipo | SaaS externo | Self-hosted |
| Criar | POST /instance/init | POST /admin/users |
| Header admin | admintoken | Authorization |
| Conectar | POST /instance/connect | POST /session/connect |
| QR Code | Retorna no connect | GET /session/qr separado |
| Status | Via /instance/all | GET /session/status |

## Manutencao

Este modulo sera mantido para:
1. Instancias existentes que usam UAZAPI
2. Fallback caso WuzAPI tenha problemas
3. Clientes que preferem nao ter infraestrutura propria

O campo `provider` na tabela `WhatsappInstance` indica qual modulo usar:
- `provider = 'uazapi'` → usa este modulo
- `provider = 'wuzapi'` → usa modulo wuzapi

## Melhorias Futuras

1. Adicionar health check
2. Implementar Pairing Code
3. Adicionar envio de midia
4. Melhorar tratamento de erros
5. Adicionar retry com backoff
