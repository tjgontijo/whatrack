# PRD-026: TASKS — Backlog de Implementação

---

## Fases de Implementação

Estimativa total: **3-4 sprints**

---

## Fase 1: Schema e Migrations (Sprint 1)

### Task 1.1: Criar BillingPlanHistory

**Arquivo:** `prisma/schema.prisma`

```prisma
model BillingPlanHistory {
  id                    String    @id @default(cuid())
  subscriptionId        String
  subscription          BillingSubscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  
  planId                String
  plan                  BillingPlan @relation(fields: [planId], references: [id])
  
  startedAt             DateTime  @default(now())
  endedAt               DateTime? // null se plano atual
  
  reason                String    // "trial_to_paid" | "manual" | "auto_upgrade" | "downgrade"
  projectCountAtChange  Int       // Projetos que cliente tinha quando mudou
  
  createdAt             DateTime  @default(now())
  
  @@index([subscriptionId])
  @@index([planId])
  @@index([subscriptionId, startedAt])
}
```

**Subtasks:**
- [ ] Adicionar modelo ao schema
- [ ] Criar migration
- [ ] Adicionar índices
- [ ] Validar schema com `prisma validate`

### Task 1.2: Atualizar BillingSubscription

**Arquivo:** `prisma/schema.prisma`

```prisma
model BillingSubscription {
  // ... campos existentes ...
  
  // Novo:
  currentPlanId         String?
  currentPlan           BillingPlan? @relation("current", fields: [currentPlanId], references: [id])
  
  // Relação com histórico:
  planHistory           BillingPlanHistory[]
}
```

**Subtasks:**
- [ ] Adicionar `currentPlanId` ao schema
- [ ] Criar migration de ADD COLUMN
- [ ] Validar relação bidirecional
- [ ] Adicionar índice em `currentPlanId`

### Task 1.3: Atualizar BillingPlan

**Arquivo:** `prisma/schema.prisma`

```prisma
model BillingPlan {
  // ... campos existentes ...
  
  // Nova relação:
  currentSubscriptions  BillingSubscription[] @relation("current")
  planHistory           BillingPlanHistory[]
}
```

**Subtasks:**
- [ ] Adicionar relação `planHistory`
- [ ] Adicionar relação `currentSubscriptions`
- [ ] Validar schema

### Task 1.4: Seed Business Plan (10 → 5)

**Arquivo:** `prisma/seeds/seed_billing_plans.ts`

**Mudança:**
```typescript
{
  code: 'business_monthly',
  name: 'Business',
  includedProjects: 5,  // Antes: 10
  metadata: {
    monthlyPrice: '397.00',
    additionals: ['Projeto adicional por R$ 47/mês'],
    // ... resto igual ...
  },
}
```

**Subtasks:**
- [ ] Atualizar `includedProjects` de 10 para 5
- [ ] Atualizar subtitle (se houver referência a "10 projetos")
- [ ] Atualizar features list
- [ ] Rodar seed e validar no banco

### Task 1.5: Seed BillingPlanHistory para Clientes Existentes

**Arquivo:** `prisma/seeds/seed_billing_plan_history.ts` (novo)

Para cada cliente com subscription ativa:
```
INSERT INTO BillingPlanHistory
  (subscriptionId, planId, startedAt, endedAt, reason, projectCountAtChange, createdAt)
VALUES
  (sub_id, plan_id, subscription.purchaseDate, NULL, 'trial_to_paid', projectCount, now())
```

**Subtasks:**
- [ ] Criar seed script
- [ ] Para cada subscription, contar projects
- [ ] Criar entry em BillingPlanHistory
- [ ] Atualizar `currentPlanId` em subscription

---

## Fase 2: Lógica de Auto-Upgrade (Sprint 2)

### Task 2.1: Criar Serviço de Detecção

**Arquivo:** `src/services/billing/billing-plan-detection.service.ts` (novo)

```typescript
export class BillingPlanDetectionService {
  async detectRequiredPlan(projectCount: number): Promise<BillingPlan | null>
  async isUpgradeNeeded(subscription: BillingSubscription, projectCount: number): Promise<boolean>
  async findSmallestPlanThatFits(projectCount: number): Promise<BillingPlan>
}
```

**Subtasks:**
- [ ] Implementar `detectRequiredPlan` (retorna menor plano ou null)
- [ ] Implementar `isUpgradeNeeded` (boolean)
- [ ] Implementar `findSmallestPlanThatFits`
- [ ] Testes unitários (todas as sequências de upgrade)
- [ ] Test edge case: projeto count > máximo

### Task 2.2: Criar Serviço de Prorating

**Arquivo:** `src/services/billing/billing-prorating.service.ts` (novo)

```typescript
export class BillingProratingService {
  calculateProrating(
    oldPlan: BillingPlan,
    newPlan: BillingPlan,
    cycleStartDate: Date,
    upgradeDate: Date,
    cycleEndDate: Date
  ): ProratingResult
}

interface ProratingResult {
  creditAmount: Decimal;
  chargeAmount: Decimal;
  netAmount: Decimal; // pode ser negativo (crédito)
  daysRemaining: number;
}
```

**Subtasks:**
- [ ] Calcular dias restantes (considerando fusos)
- [ ] Calcular crédito do plano antigo
- [ ] Calcular cobrança do plano novo
- [ ] Retornar resultado (com validação de precisão)
- [ ] Testes: bordas de mês, ano bissexto, transição de horário
- [ ] Testes: ciclos anual vs mensal

### Task 2.3: Criar Serviço de Histórico

**Arquivo:** `src/services/billing/billing-plan-history.service.ts` (novo)

```typescript
export class BillingPlanHistoryService {
  async recordPlanChange(
    subscriptionId: string,
    newPlanId: string,
    reason: 'auto_upgrade' | 'manual' | 'trial_to_paid',
    projectCount: number
  ): Promise<BillingPlanHistory>

  async getCurrentPlan(subscriptionId: string): Promise<BillingPlan | null>

  async getHistory(subscriptionId: string): Promise<BillingPlanHistory[]>

  async closePreviousPlan(subscriptionId: string): Promise<void>
}
```

**Subtasks:**
- [ ] Implementar `recordPlanChange`
- [ ] Implementar `getCurrentPlan` (derivado ou via cache)
- [ ] Implementar `getHistory` (ORDER BY startedAt DESC)
- [ ] Implementar `closePreviousPlan` (SET endedAt = now())
- [ ] Testes de auditoria (histórico nunca deletado)

### Task 2.4: Integração no Project Creation Flow

**Arquivo:** `src/services/project/project.service.ts` (existente)

Adicionar no método `createProject`:

```typescript
async createProject(input) {
  // ... validações existentes ...

  const project = await prisma.project.create({ data });
  
  // ✨ NOVO: Detectar upgrade
  const projectCount = await this.countProjects(input.organizationId);
  const subscription = await this.getSubscription(input.organizationId);
  
  if (await this.detectionService.isUpgradeNeeded(subscription, projectCount)) {
    await this.performAutoUpgrade(subscription, projectCount);
  }

  return project;
}
```

**Subtasks:**
- [ ] Adicionar chamada a `detectionService.isUpgradeNeeded`
- [ ] Chamar `performAutoUpgrade` se necessário
- [ ] Não bloquear criação de projeto
- [ ] Tratar erro de upgrade (log, não falha)

---

## Fase 3: Criação de Invoice no Upgrade (Sprint 2/3)

### Task 3.1: Criar Serviço de Auto-Upgrade

**Arquivo:** `src/services/billing/billing-auto-upgrade.service.ts` (novo)

```typescript
export class BillingAutoUpgradeService {
  async performAutoUpgrade(
    subscription: BillingSubscription,
    currentPlan: BillingPlan,
    newPlan: BillingPlan,
    projectCount: number
  ): Promise<{ history: BillingPlanHistory; invoice: BillingInvoice }>
}
```

**Fluxo interno:**
1. Validar que newPlan > currentPlan
2. Calcular prorating
3. Criar entry em BillingPlanHistory (reason: auto_upgrade)
4. Encerrar plano anterior (SET endedAt)
5. Criar novo invoice (prorated)
6. Atualizar currentPlanId em subscription
7. Retornar ambos

**Subtasks:**
- [ ] Implementar fluxo
- [ ] Usar transação (atomicidade)
- [ ] Validar prorating antes de criar invoice
- [ ] Testes: múltiplos upgrades em cascata (transaction isolation)

### Task 3.2: Integração com Asaas

**Arquivo:** `src/services/billing/asaas-payment.service.ts` (existente)

Adicionar método:

```typescript
async createProratedInvoice(
  subscription: BillingSubscription,
  newPlan: BillingPlan,
  proratingResult: ProratingResult
): Promise<BillingInvoice>
```

**Subtasks:**
- [ ] POST /payments no Asaas com novo amount
- [ ] Usar `idempotencyKey` para segurança
- [ ] Tratar erro se Asaas falhar
- [ ] Registrar em BillingInvoice com status PENDING
- [ ] Testes com Asaas sandbox

---

## Fase 4: Notificações e UI (Sprint 3)

### Task 4.1: Email de Notificação

**Arquivo:** `src/services/email/billing-notification.service.ts` (novo)

```typescript
async sendAutoUpgradeEmail(
  subscription: BillingSubscription,
  oldPlan: BillingPlan,
  newPlan: BillingPlan,
  invoiceAmount: Decimal
): Promise<void>
```

**Template:** `emails/billing-auto-upgrade.tsx`

**Subtasks:**
- [ ] Criar template React
- [ ] Implementar serviço de envio
- [ ] Garantir idempotência (send 1x)
- [ ] Testes: email chega com dados corretos
- [ ] Fallback silencioso (erro não bloqueia fluxo)

### Task 4.2: Componente Invoice do Plano

**Arquivo:** `src/components/dashboard/billing/billing-plan-invoice.tsx` (novo)

Exibir um "comprovante visual" do plano vigente:

```tsx
export function BillingPlanInvoice() {
  // Buscar:
  // - subscription.currentPlan
  // - subscription.expiresAt (vigência)
  // - countProjects(organizationId)
  // - lastInvoice
  
  // Exibir:
  // - Nome do plano + badge de status
  // - Features do plano (extrair de metadata)
  // - Limite de projetos vs quantidade atual
  // - Vigência (data início - data fim)
  // - Método de pagamento (cartão)
  // - Valor mensalidade
  // - Próxima cobrança
  // - Link para histórico
}
```

**Subtasks:**
- [ ] Criar componente
- [ ] Buscar `currentPlan` + `currentPlanId` via hook
- [ ] Extrair features de `plan.metadata.features`
- [ ] Mostrar contador de projetos (usado / limite)
- [ ] Calcular próxima cobrança (expiresAt + 1 dia)
- [ ] Estilo card tipo invoice (border, padding, cores)
- [ ] Responsivo (desktop e mobile)
- [ ] Testes visuais

### Task 4.3: Integrar Invoice no BillingStatus

**Arquivo:** `src/components/dashboard/billing/billing-status.tsx` (existente)

Adicionar seção de invoice antes das faturas:

```tsx
export function BillingStatus() {
  return (
    <div className="space-y-6">
      <BillingPlanInvoice />  {/* ✨ NOVO */}
      {/* ... resto do código existente ... */}
    </div>
  )
}
```

**Subtasks:**
- [ ] Importar novo componente
- [ ] Integrar no BillingStatus
- [ ] Remover duplicação de info com BillingStatus (se houver)
- [ ] Testar layout (deve caber bem)

### Task 4.4: Endpoint de Histórico (Preparação)

**Arquivo:** `src/app/api/v1/billing/history/route.ts` (novo)

```typescript
export async function GET(req: Request) {
  const history = await planHistoryService.getHistory(organizationId);
  return Response.json(history);
}
```

**Subtasks:**
- [ ] Criar endpoint
- [ ] Autenticação + autorização
- [ ] Testes
- [ ] Documentação OpenAPI

---

## Fase 5: Testes e QA (Sprint 4)

### Task 5.1: Testes de Integração

**Arquivo:** `src/services/billing/__tests__/auto-upgrade.test.ts` (novo)

Testes:
- [ ] UC1: Starter → Pro (1→2 projetos)
- [ ] UC2: Pro → Business (3→4 projetos)
- [ ] UC3: Pro sem upgrade (1→2 projetos, limite 3)
- [ ] Múltiplos upgrades em cascata
- [ ] Prorating calculado corretamente
- [ ] Email enviado

**Comando:**
```bash
npm test -- auto-upgrade.test
```

### Task 5.2: Testes de Prorating

**Arquivo:** `src/services/billing/__tests__/prorating.test.ts` (novo)

Testes:
- [ ] Upgrade no dia 1 do ciclo
- [ ] Upgrade no último dia
- [ ] Upgrade no meio
- [ ] Ciclo anual
- [ ] Fusos horários / DST
- [ ] Precisão decimal (2 casas)

### Task 5.3: Teste com Asaas Sandbox

**Manual:**
- [ ] Criar conta sandbox no Asaas
- [ ] Gerar API key
- [ ] Configurar webhook
- [ ] Simular auto-upgrade de verdade
- [ ] Validar invoice criado no painel Asaas
- [ ] Validar webhook de confirmação

### Task 5.4: Teste de Migração

**Manual:**
- [ ] Rodar seeds em dev
- [ ] Verificar clientes existentes têm entry em BillingPlanHistory
- [ ] Verificar `currentPlanId` está populado
- [ ] Validar integridade (sem orphans)

---

## Fase 6: Rollout (Sprint 4)

### Task 6.1: Validação Pré-Prod

- [ ] Code review PRD + design
- [ ] Testes de performance (Q1 acima)
- [ ] Testes de segurança (idempotência, auth)
- [ ] Documentação de API atualizada

### Task 6.2: Deploy em Staging

- [ ] Migração rodada
- [ ] Seeds rodadas
- [ ] Testes E2E em staging
- [ ] Verificar logs de sucesso

### Task 6.3: Deploy em Produção

- [ ] Backup do banco
- [ ] Deploy de código
- [ ] Rodar migration
- [ ] Validar no dashboard
- [ ] Monitorar logs por 1h
- [ ] Testar auto-upgrade com cliente real (opt-in)

---

## Critérios de Conclusão

✅ Implementação:
- [ ] Schema atualizado e migrations rodadas
- [ ] Serviços de auto-upgrade funcionam
- [ ] Prorating calculado com precisão
- [ ] Histórico registrado para cada mudança

✅ Testes:
- [ ] 90%+ coverage nas lógicas críticas
- [ ] Todos os UCs passando
- [ ] Teste de prorating com 15+ casos

✅ Produto:
- [ ] Email enviado ao cliente
- [ ] Dashboard mostra plano corrente
- [ ] Business plan reduzido para 5 projetos
- [ ] Nenhum cliente com "projetos extras" sem plano

✅ Operacional:
- [ ] Documentação atualizada
- [ ] Runbook de troubleshooting
- [ ] Monitoramento de anomalias

