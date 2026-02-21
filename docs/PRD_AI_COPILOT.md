# WhaTrack - AI Copilot (Supervisor de Conversões): PRD v1

## Visão Geral

O **WhaTrack AI Copilot** é um serviço autônomo baseado em inteligência artificial (orquestrado pelo framework **Mastra AI**) construído para resolver o principal gargalo em CRMs: a falta de preenchimento manual de dados pelas equipes de atendimento.

O Copilot atua escaneando conversas recentes, detectando intenções de sucesso (Vendas ou Qualificações) e gerando **Aprovações Pendentes** em uma tela administrativa. O gestor da clínica pode com um único clique aprovar a conversão detectada, registrando a venda e ativando o serviço de Meta Conversions API (CAPI).

---

## Arquitetura de Dados e Fluxo

```
Organization
├── Ticket (Atendimento atual)
│   ├── Messages[] (Histórico das conversas)
│   └── AiConversionApprovals[] (Sugestões de Venda da IA)
│       ├── (Aprovação Manual do Gestor)
│       └── Sales[] (Venda registrada + Disparo CAPI)
```

### Relacionamentos

| Entidade | Cardinalidade | Descrição |
|----------|---------------|-----------|
| Ticket → AiConversionApproval | 1:N | Um ticket pode receber múltiplas aprovações da IA ao longo do tempo. |
| Organization → AiConversionApproval | 1:N | Gerencia permissões e acesso aos painéis administrativos de aprovação. |
| AiConversionApproval → Sale | 1:1 | Ao ser aprovada, a sugestão se converte em uma Venda e Fecha o Ticket. |

---

## Modelo de Dados (Prisma)

### AiConversionApproval (Novo Status)
```prisma
model AiConversionApproval {
  id             String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId String       @db.Uuid
  ticketId       String       @db.Uuid
  
  eventName      String       // "LeadSubmitted" | "Purchase"
  productName    String?      // e.g., "Botox", "Preenchimento Labial"
  dealValue      Decimal?     @db.Decimal(12, 2)
  confidence     Float        @default(1.0) // 0.0 to 1.0
  reasoning      String?      // Texto justificando a decisão (Contexto lido)
  
  status         String       @default("PENDING") // PENDING, APPROVED, REJECTED
  
  reviewedBy     String?      @db.Uuid // ID do Gestor que aprovou/negou
  reviewedAt     DateTime?
  
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organization   Organization @relation(...)
  ticket         Ticket       @relation(...)

  @@index([organizationId])
  @@index([ticketId])
  @@index([status])
  @@map("ai_conversion_approvals")
}
```

---

## Fluxo: Avaliação da Conversa (Agente Passivo)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Webhook recebe mensagem do WhatsApp (In/Out)             │
│    -> messages.handler.ts                                   │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Job Adicionado à Fila (Redis/Upstash) com Debounce       │
│    -> Exemplo: Delay de 5 minutos.                          │
│    -> Se chegar nova msg, o delay reseta e se posterga.     │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Execução do Worker (Passado o Delay)                     │
│    -> Trigger do Mastra AI Agent (ai-classifier.service.ts) │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Prompt para a IA via Mastra                              │
│    -> Coleta as últimas 30 mensagens do Ticket              │
│    -> Gera output via schema (Zod) extraindo intenção       │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Salvamento no Banco (Se `intent` == 'SALE' e > 0.8 conf) │
│    -> Criação de Registro na tabela `AiConversionApproval`  │
│    -> Ping em Real-Time (Centrifugo) pro Painel Web         │
└─────────────────────────────────────────────────────────────┘
```

---

## O Motor do Mastra AI (Agente / Workflow)

O `ai-classifier.service.ts` usará as ferramentas (Tools) ou Workflows do `mastra` para orquestrar a IA:

```json
{
  "type": "object",
  "properties": {
    "intent": { "type": "string", "enum": ["SALE", "QUALIFIED", "NEUTRAL"] },
    "productName": { "type": "string", "description": "Nome do procedimento detectado" },
    "dealValue": { "type": "number", "description": "Valor negociado (ex: 1500.00)" },
    "reasoning": { "type": "string", "description": "Base/trecho para a classificação" },
    "confidence": { "type": "number", "description": "Confiabilidade de 0.0 a 1.0" }
  },
  "required": ["intent", "confidence", "reasoning"]
}
```

---

## API Endpoints (Novos)

| Método | Endpoint | Descrição | Roles |
|--------|----------|-----------|-------|
| GET | `/api/v1/ai-approvals` | Lista os eventos aguardando ação. | `manage:tickets` |
| PATCH | `/api/v1/ai-approvals/:id/approve` | Transforma análise em Sale e aciona CAPI. | `manage:tickets` |
| PATCH | `/api/v1/ai-approvals/:id/reject` | Cancela/Descarta evento da IA (Falso positivo). | `manage:tickets` |

---

## Tela: Painel de Aprovações Inteligentes

**Rota:** `/app/dashboard/approvals/page.tsx`

**Requisitos da Tela:**
1. Listará todas aprovações pendentes (Cards) ordenadas pela data (`createdAt`).
2. Mostrará clareza em: Contato, Produto, Valor em Reais e Porcentagem de Certeza da IA.
3. Possibilita 3 ações ao Gestor:
   - **Rejeitar (✕)**: Se for falso positivo, marca como `REJECTED`, nada acontece.
   - **Corrigir Preço (✎)**: O preenchimento estava errado (ex: R$100 ao invés de R$1000). O Gestor altera e aprova.
   - **Aprovar (✅)**: Executa a ação dupla abaixo:

### Lógica da Aprovação (Backend)

Ao efetivar a rota `/ai-approvals/:id/approve`:
```typescript
// 1. Marcar status
approval.status = 'APPROVED';
approval.reviewedBy = userId;

// 2. Criar a `Sale` baseada no Produto e Valor do Approval
const pendingSale = createSale({
   value: approval.dealValue,
   productName: approval.productName
});

// 3. Modificar o Status do Ticket (Closed Won)
ticket.status = 'closed_won';
ticket.dealValue = approval.dealValue;

// 4. (Principal) Disparar o Meta Capi Service
metaCapiService.sendEvent('Purchase', {
   value: approval.dealValue
});
```

---

## Passos para Implementação
1. **[CONCLUÍDO]** Schema Prisma: Adição de `AiConversionApproval`.
2. **[CONCLUÍDO]** Instalação do `@mastra/core` e migração das SDKs Vercel/AI obsoletas.
3. Configuração do Worker (Upstash/Redis) para função de Debounce nos webhooks atuais.
4. Escrita do `ai-classifier.service.ts` importando as chamadas de API do Mastra.
5. Criação das APIs de CRUD (`/api/v1/ai-approvals`).
6. Interface de Usuário (Gestor de Aprovações).
