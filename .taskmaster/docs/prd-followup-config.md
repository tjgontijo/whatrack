# PRD: Configuração de Follow-up

## Problema

Cada empresa tem cadência e tom diferentes para follow-ups.

## Solução

Página de configuração onde a organização define:
- Cadência (delays entre steps)
- Horário comercial
- Contexto para a IA (tom, tipo de negócio, produto)

**Nota**: Estas configurações são **por organização** e se aplicam a todos os tickets. O follow-up em si é ativado **por ticket** pelo atendente.

---

## Configurações Disponíveis

### Cadência (Steps Dinâmicos)

A empresa cria quantos steps quiser, cada um com seu delay. **Não há limite fixo**.

```typescript
// Estrutura de um step
interface FollowUpStep {
  order: number      // 1, 2, 3...
  delayMinutes: number  // Delay após step anterior (ou após resposta do atendente no step 1)
  label?: string     // Label opcional (ex: "Lembrete rápido", "Última tentativa")
}
```

**Default (3 steps):**

| Step | Delay | Label |
|------|-------|-------|
| 1 | 30 min | Lembrete rápido |
| 2 | 2 horas | Segundo toque |
| 3 | 24 horas | Última tentativa |

### Horário Comercial

| Config | Default | Descrição |
|--------|---------|-----------|
| `businessHoursOnly` | true | Enviar apenas em horário comercial |
| `businessStartHour` | 9 | Hora de início (0-23) |
| `businessEndHour` | 18 | Hora de fim (0-23) |
| `businessDays` | [1,2,3,4,5] | Dias da semana (0=Dom, 6=Sab) |

### Contexto para IA

| Config | Default | Descrição |
|--------|---------|-----------|
| `aiTone` | "professional" | Tom das mensagens |
| `businessType` | null | Tipo de negócio |
| `productDescription` | null | O que a empresa vende |
| `customInstructions` | null | Instruções extras |

---

## Tons Disponíveis

| Tom | Descrição | Exemplo |
|-----|-----------|---------|
| `professional` | Formal, corporativo | "Prezado João, gostaria de retomar nosso contato..." |
| `friendly` | Informal, próximo | "Oi João! Tudo bem? Passando pra ver se..." |
| `urgent` | Senso de urgência | "João, essa é minha última tentativa de contato..." |

---

## Modelo de Dados

```prisma
model FollowUpConfig {
  id             String   @id @default(cuid())
  organizationId String   @unique
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  isActive       Boolean  @default(true)

  // Horário comercial
  businessHoursOnly  Boolean  @default(true)
  businessStartHour  Int      @default(9)
  businessEndHour    Int      @default(18)
  businessDays       Int[]    @default([1,2,3,4,5])

  // Contexto IA
  aiTone             String   @default("professional")
  businessType       String?
  productDescription String?
  customInstructions String?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relação com steps
  steps          FollowUpStep[]

  @@map("followup_configs")
}

// Steps dinâmicos - empresa cria quantos quiser
model FollowUpStep {
  id             String   @id @default(cuid())
  configId       String
  config         FollowUpConfig @relation(fields: [configId], references: [id], onDelete: Cascade)

  order          Int      // 1, 2, 3, 4...
  delayMinutes   Int      // Delay em minutos após step anterior
  label          String?  // Label opcional ("Lembrete rápido", "Última tentativa")

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([configId, order])
  @@index([configId])
  @@map("followup_steps")
}
```

**Nota**: Os steps são ordenados pelo campo `order`. A empresa pode adicionar, remover e reordenar steps livremente.

---

## APIs

```
GET /api/v1/settings/followup-config
Response: FollowUpConfig

PATCH /api/v1/settings/followup-config
Body: Partial<FollowUpConfig>
```

---

## UI: Página de Configuração

```
┌─────────────────────────────────────────────────────────────┐
│  Configurações > Follow-up Automático                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [✓] Follow-up automático ativo                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  CADÊNCIA (1 crédito por step enviado)                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │  Step 1: [30 ▼] minutos  "Lembrete rápido"    [🗑️]  │    │
│  │  Step 2: [2 ▼] horas     "Segundo toque"      [🗑️]  │    │
│  │  Step 3: [24 ▼] horas    "Última tentativa"   [🗑️]  │    │
│  │                                                     │    │
│  │  [+ Adicionar Step]                                 │    │
│  │                                                     │    │
│  │  ℹ️ Você pode criar quantos steps quiser.           │    │
│  │     Cada step enviado consome 1 crédito.            │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  HORÁRIO COMERCIAL                                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │  [✓] Enviar apenas em horário comercial             │    │
│  │                                                     │    │
│  │  Horário: das [09:00 ▼] às [18:00 ▼]                │    │
│  │                                                     │    │
│  │  Dias:                                              │    │
│  │  [✓] Seg  [✓] Ter  [✓] Qua  [✓] Qui  [✓] Sex       │    │
│  │  [ ] Sáb  [ ] Dom                                   │    │
│  │                                                     │    │
│  │  ℹ️ Mensagens fora do horário serão reagendadas     │    │
│  │     para o próximo horário disponível               │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  CONTEXTO PARA IA                                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │  Tom das mensagens:                                 │    │
│  │  ○ Profissional  ● Amigável  ○ Urgente              │    │
│  │                                                     │    │
│  │  Tipo de negócio:                                   │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ Software B2B                                │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                                                     │    │
│  │  Descrição do produto/serviço:                      │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ CRM para equipes de vendas com integração   │    │    │
│  │  │ WhatsApp e automação de follow-ups          │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                                                     │    │
│  │  Instruções extras para IA:                         │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ - Sempre mencionar suporte 24h               │    │    │
│  │  │ - Não oferecer desconto acima de 10%        │    │    │
│  │  │ - Mencionar cases de sucesso quando possível │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    [Salvar Configurações]           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Templates de Cadência (sugestões rápidas)

```
┌─────────────────────────────────────────────────────────────┐
│  Usar template:                                             │
│                                                             │
│  [📋 Padrão (3 steps)]  [🚀 Agressivo (5 steps)]           │
│  [🐢 Suave (3 steps)]   [🎯 Personalizado]                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Validações

| Campo | Validação |
|-------|-----------|
| `steps` | Mínimo 1 step, máximo 20 |
| `step.delayMinutes` | 5-10080 minutos (máx 7 dias) |
| `step.order` | Único por config |
| `businessStartHour` | 0-23, < endHour |
| `businessEndHour` | 0-23, > startHour |
| `businessDays` | Array não vazio |
| `businessType` | Max 100 chars |
| `productDescription` | Max 500 chars |
| `customInstructions` | Max 1000 chars |

---

## Default ao criar organização

```typescript
async function createDefaultFollowupConfig(organizationId: string) {
  const config = await prisma.followUpConfig.create({
    data: {
      organizationId,
      isActive: true,
      businessHoursOnly: true,
      businessStartHour: 9,
      businessEndHour: 18,
      businessDays: [1, 2, 3, 4, 5],
      aiTone: 'professional',
      steps: {
        create: [
          { order: 1, delayMinutes: 30, label: 'Lembrete rápido' },
          { order: 2, delayMinutes: 120, label: 'Segundo toque' },
          { order: 3, delayMinutes: 1440, label: 'Última tentativa' },
        ]
      }
    },
    include: { steps: true }
  })
  return config
}
```
