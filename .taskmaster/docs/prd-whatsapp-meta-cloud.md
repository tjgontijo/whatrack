# PRD: WhatsApp Meta Cloud API Module

## Overview

Modulo de integracao com a API oficial do WhatsApp Business (Meta Cloud API). O Whatrack atua como **Tech Provider / Solution Partner** da Meta, permitindo que clientes do SaaS conectem suas proprias contas WhatsApp Business em **modo coexistencia**.

**Status**: Planejado (futuro)

## Modelo de Negocio

```
┌─────────────────────────────────────────────────────────────┐
│                    META (WhatsApp)                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              WHATRACK (Tech Provider)                       │
│                                                             │
│  • App registrado na Meta                                   │
│  • Recebe webhooks de todos os clientes                    │
│  • Envia mensagens em nome dos clientes                    │
└─────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
      ┌─────────┐     ┌─────────┐     ┌─────────┐
      │Cliente A│     │Cliente B│     │Cliente C│
      │(própria │     │(própria │     │(própria │
      │ conta)  │     │ conta)  │     │ conta)  │
      └─────────┘     └─────────┘     └─────────┘
```

**Modo Coexistencia**: O numero do cliente pode estar conectado a multiplos provedores simultaneamente.

## Caracteristicas do Provider

| Aspecto | Descricao |
|---------|-----------|
| **Tipo** | API Oficial Meta |
| **Modelo** | Tech Provider (coexistencia) |
| **Autenticacao** | Embedded Signup / Token do cliente |
| **Sessao** | Sempre "conectado" (token based) |
| **Custo** | Cliente paga direto pra Meta |

## Escopo MVP

### Implementar (2 endpoints principais)
1. **Webhook** - Receber mensagens dos clientes
2. **Send Message** - Enviar mensagens em nome dos clientes

### Implementar Depois
- Embedded Signup (onboarding simplificado)
- Templates management
- Media upload

## Estrutura do Modulo (Simplificada)

```
src/services/whatsapp/meta-cloud/
├── config.ts           # Configuracao do app
├── webhook-handler.ts  # Receber mensagens
├── webhook-verify.ts   # Verificacao inicial
├── send-message.ts     # Enviar mensagens
└── index.ts
```

## Environment Variables

```env
# Meta App (Whatrack como Tech Provider)
META_APP_ID=seu_app_id
META_APP_SECRET=seu_app_secret
META_WEBHOOK_VERIFY_TOKEN=seu_verify_token
META_API_VERSION=v21.0
```

## Dados por Cliente (Organizacao)

Cada cliente fornece seus proprios dados ao conectar:

```typescript
// Armazenado no banco por organizacao
{
  phoneNumberId: string    // ID do numero na Meta
  wabaId: string           // WhatsApp Business Account ID
  accessToken: string      // Token permanente do cliente
  phoneNumber: string      // Numero formatado
}
```

## Endpoints

### 1. Webhook - Receber Mensagens

```typescript
// GET /api/v1/whatsapp/meta-cloud/webhook
// Verificacao inicial da Meta
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

// POST /api/v1/whatsapp/meta-cloud/webhook
// Receber mensagens
export async function POST(request: Request) {
  const body = await request.json()

  // Estrutura do webhook Meta
  for (const entry of body.entry) {
    for (const change of entry.changes) {
      if (change.field === 'messages') {
        const value = change.value
        const phoneNumberId = value.metadata.phone_number_id

        // Encontrar organizacao pelo phoneNumberId
        const credential = await prisma.metaWhatsAppCredential.findUnique({
          where: { phoneNumberId }
        })

        if (!credential) continue

        // Processar mensagens
        for (const message of value.messages || []) {
          await processIncomingMessage({
            organizationId: credential.organizationId,
            message,
            contact: value.contacts?.[0]
          })
        }
      }
    }
  }

  return NextResponse.json({ success: true })
}
```

### 2. Send Message - Enviar Mensagens

```typescript
// POST /api/v1/whatsapp/meta-cloud/messages
export async function sendMetaCloudMessage({
  organizationId,
  to,
  text,
}: {
  organizationId: string
  to: string
  text: string
}) {
  const credential = await prisma.metaWhatsAppCredential.findUnique({
    where: { organizationId },
  })

  if (!credential) {
    throw new Error('WhatsApp Business not connected')
  }

  const response = await fetch(
    `https://graph.facebook.com/${process.env.META_API_VERSION}/${credential.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credential.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
      }),
    }
  )

  return response.json()
}
```

## Modelo de Dados

```prisma
// Credenciais do cliente (por organizacao)
model MetaWhatsAppCredential {
  id             String       @id @default(cuid())
  organizationId String       @unique
  organization   Organization @relation(...)

  // Dados fornecidos pelo cliente
  phoneNumberId  String       @unique  // Para lookup no webhook
  wabaId         String                // WhatsApp Business Account ID
  accessToken    String       @db.Text // Token permanente
  phoneNumber    String                // Display: +55 11 99999-9999

  // Status
  isActive       Boolean      @default(true)

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @default(now()) @updatedAt

  @@map("meta_whatsapp_credentials")
}
```

## Formato do Webhook (Recebido da Meta)

```typescript
{
  object: "whatsapp_business_account",
  entry: [{
    id: "WABA_ID",
    changes: [{
      value: {
        messaging_product: "whatsapp",
        metadata: {
          display_phone_number: "5511999999999",
          phone_number_id: "PHONE_NUMBER_ID"  // Chave para identificar cliente
        },
        contacts: [{
          profile: { name: "Contact Name" },
          wa_id: "5511888888888"
        }],
        messages: [{
          id: "wamid.xxxxx",
          from: "5511888888888",
          timestamp: "1234567890",
          type: "text",
          text: { body: "Ola!" }
        }]
      },
      field: "messages"
    }]
  }]
}
```

## Fluxo de Conexao do Cliente

```
1. Cliente acessa configuracoes no Whatrack
2. Insere dados do WhatsApp Business:
   - Phone Number ID
   - WABA ID
   - Access Token (permanente)
3. Whatrack salva credenciais
4. Cliente comeca a receber mensagens
5. Cliente pode enviar mensagens
```

**Nota**: No futuro, implementar Embedded Signup para simplificar onboarding.

## UI do Cliente

```
┌─────────────────────────────────────────────────────────────┐
│  Conectar WhatsApp Business (API Oficial)                   │
│                                                             │
│  Phone Number ID:  [____________________]                   │
│  WABA ID:          [____________________]                   │
│  Access Token:     [____________________]                   │
│                                                             │
│  [Testar Conexao]  [Salvar]                                │
│                                                             │
│  📖 Como obter esses dados?                                │
│     → Acesse developers.facebook.com                       │
│     → WhatsApp > API Setup                                 │
└─────────────────────────────────────────────────────────────┘
```

## Diferencas vs WuzAPI/UAZAPI

| Aspecto | WuzAPI/UAZAPI | Meta Cloud |
|---------|---------------|------------|
| Conexao | QR Code | Token do cliente |
| Sessao | Pode desconectar | Sempre ativa |
| Webhook | Por instancia | Centralizado (phoneNumberId) |
| Custo | Infra propria / SaaS | Cliente paga Meta |
| Suporte | Comunidade | Oficial Meta |

## Tasks MVP

1. Criar modelo `MetaWhatsAppCredential` no Prisma
2. Criar endpoint GET webhook (verificacao)
3. Criar endpoint POST webhook (receber mensagens)
4. Criar funcao `sendMetaCloudMessage`
5. Criar UI para cliente inserir credenciais
6. Criar funcao de teste de conexao
7. Documentar como cliente obtem credenciais

## Tasks Futuras

- Embedded Signup (onboarding simplificado)
- Templates management
- Media upload/download
- Read receipts
- Typing indicators
