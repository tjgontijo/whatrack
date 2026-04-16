# PRD-026: DIAGNOSTIC — Decisões Técnicas, Riscos e Prorating

---

## 1. Decisões de Design

### 1.1 Por que Auto-Upgrade na Criação de Projeto?

**Alternativas consideradas:**

| Abordagem | Prós | Contras |
|-----------|------|---------|
| **Auto na criação** ✅ | Imediato, transparente, sem email chato | Pode mudar billing de forma inesperada |
| Background job | Pode ser mais elegante | Delay, complexo com múltiplas operações |
| Bloquear projeto | Força choice clara | Péssima UX (cliente não consegue criar) |
| Manual + email | Máximo controle do cliente | Cliente não paga, reclama depois |

**Decisão:** Auto-upgrade na criação (mais direto e alinhado com crescimento)

### 1.2 Plano Corrente: Cache vs Derivado?

Opção A: Guardar `currentPlanId` em `BillingSubscription` (cache, mais rápido)
Opção B: Sempre derivar do último `BillingPlanHistory` sem `endedAt`

**Decisão:** Opção A (currentPlanId cache)

**Motivo:** Query mais rápida, menos complex joins, especialmente relevante em relatórios

**Validação:** BillingPlanHistory sempre está em sync (invariante garantida por app logic)

### 1.3 Prorating: Quando e Como?

**Cenário:** Cliente muda de Starter (R$ 97/mês) para Pro (R$ 197/mês) no dia 16 de um ciclo de 30 dias.

**Opção A: Linear por dia**
```
Dias restantes = 30 - 16 + 1 = 15 dias

Crédito Starter: 15 dias × (97 / 30) = R$ 48.50
Cobrança Pro: 15 dias × (197 / 30) = R$ 98.50

Saldo = R$ 98.50 - R$ 48.50 = R$ 50.00 a cobrar
```

**Opção B: Sem prorating (mais simples)**
```
Cancelar fatura anterior
Cobrar full R$ 197 no novo ciclo
```

**Decisão:** Opção A (linear por dia)

**Motivo:** 
- Justo para cliente
- Padrão de SaaS
- Asaas suporta nativamente

### 1.4 Novo Invoice: Imediato ou Esperar Ciclo?

**Opção A: Imediato (hoje)**
- Novo invoice gerado no dia da mudança
- Prorating aplicado
- Próximo ciclo segue normalmente

**Opção B: Esperar ciclo**
- Registra mudança em history
- Novo invoice gerado apenas no próximo ciclo
- Sem prorating

**Decisão:** Opção A (imediato)

**Motivo:** Mais justo, alinha cobrança com crescimento real

---

## 2. Modelo Matemático de Prorating

### 2.1 Fórmula Geral

```
diasRestantes = (cicloFinal - dataMudanca) em dias

creditoAntigo = diasRestantes × (valorPanoAntigo / diasPorCiclo)
cobrancaNova = diasRestantes × (valorPlanNoNovo / diasPorCiclo)

saldoAFaturar = cobrancaNova - creditoAntigo
```

### 2.2 Exemplos de Cálculo

**Exemplo 1: Starter → Pro (ciclo 30 dias)**
```
Ciclo começa: 2026-04-01
Upgrade em: 2026-04-16
Ciclo termina: 2026-05-01

Dias restantes = 30 - 15 = 15 dias

Starter: R$ 97/mês → R$ 97/30 = R$ 3.23/dia
Crédito: 15 × 3.23 = R$ 48.45

Pro: R$ 197/mês → R$ 197/30 = R$ 6.57/dia
Cobrança: 15 × 6.57 = R$ 98.55

Faturar: R$ 98.55 - R$ 48.45 = R$ 50.10
```

**Exemplo 2: Pro → Business (ciclo 30 dias)**
```
Ciclo começa: 2026-03-10
Upgrade em: 2026-03-25
Ciclo termina: 2026-04-10

Dias restantes = 30 - 15 = 15 dias

Pro: R$ 197/mês → R$ 197/30 = R$ 6.57/dia
Crédito: 15 × 6.57 = R$ 98.55

Business: R$ 397/mês → R$ 397/30 = R$ 13.23/dia
Cobrança: 15 × 13.23 = R$ 198.45

Faturar: R$ 198.45 - R$ 98.55 = R$ 99.90
```

### 2.3 Edge Cases

**E se upgrade acontecer no último dia?**
```
Dias restantes = 1
Prorating se aplica normalmente
Valores serão pequeninhos mas precisos
```

**E se ciclo for anual?**
```
(Mesmo cálculo, mas com 365 dias)
```

**E se ocorrer múltiplos upgrades no mesmo ciclo?**
```
Upgrade 1: Starter → Pro (dia 10)
Upgrade 2: Pro → Business (dia 20)

Cada um gera novo invoice
Prorating se aplica entre cada mudança
Próximo ciclo volta ao normal
```

---

## 3. Implementação no Asaas

### 3.1 Fluxo Técnico

```
1. App detecta upgrade (N projetos > limite)
2. Encontra novo plano
3. Calcula prorating
4. GET /payments para pegar invoice atual (pendente/pago)
5. DELETE /payments/{id} para cancelar (opcional, se ainda pendente)
6. POST /payments para criar novo invoice
   - amount: saldoAFaturar
   - dueDate: mesma data anterior ou próxima data útil?
7. Registra em BillingPlanHistory
8. Registra em BillingInvoice
9. Envia email
```

### 3.2 Idempotência

**Risco:** E se a requisição POST ao Asaas falhar no meio?

**Proteção:**
- Usar `idempotencyKey` do Asaas
- Hash: `${subscriptionId}-${planId}-${upgradeTimestamp}`
- Retry seguro: mesma chave retorna invoice anterior

---

## 4. Riscos e Mitigações

### Risco 1: Upgrade em Cascata (Muito Rápido)

**Cenário:** Cliente cria 5 projetos em 2 segundos, cada um dispara auto-upgrade

**Impacto:** Múltiplos invoices, confusão

**Mitigação:**
```
- Usar transação: contar + verificar + criar histórico atomicamente
- Lock otimista no subscription
- Teste com bulk create de projetos
```

### Risco 2: Prorating Impreciso

**Cenário:** Cálculo de dias com fusos horários, daylight saving, etc.

**Impacto:** Cliente cobrado R$ 0.01 a mais

**Mitigação:**
- Sempre usar UTC nas datas
- Roundar para 2 casas decimais (Decimal do Prisma)
- Teste com datas de transição (fim de mês, fevereiro, etc.)
- Validar cálculo no backend ANTES de enviar ao Asaas

### Risco 3: Cliente Não Recebe Email de Notificação

**Cenário:** Job de email falha silenciosamente

**Impacto:** Cliente não sabe que foi cobrado a mais

**Mitigação:**
- Email deve ser enviado mas NÃO bloqueia o fluxo
- Log de erro se email falhar
- Dashboard mostra histórico (source of truth)
- Suporte pode resend email manualmente

### Risco 4: Incompatibilidade com Ciclo Anual

**Cenário:** Cliente tem plano anual, mas auto-upgrade usa lógica de 30 dias

**Impacto:** Prorating errado

**Mitigação:**
- Usar `billingCycle` do plan (MONTHLY, YEARLY, etc.)
- Teste específico para anual
- Fórmula: `(endDate - upgradeDate).getDays()`

### Risco 5: Downgrade Manual Quebrado

**Cenário:** Admin tenta fazer downgrade manual depois

**Impacto:** Sistema espera upg automático, downgrade cria inconsistência

**Mitigação:**
- Feature de downgrade FORA do escopo desta PRD
- Se implementar depois, garantir que:
  - Cria entry em BillingPlanHistory (reason: "manual_downgrade")
  - Ajusta cálculos de prorating

---

## 5. Validação Técnica

### 5.1 Testes Necessários

**Unit Tests:**
- Prorating com múltiplas datas
- Lógica de seleção de plano (qual é o menor que comporta N projetos)
- Cálculo de dias restantes (fusos, bordas)

**Integration Tests:**
- Auto-upgrade na criação de projeto (E2E)
- BillingPlanHistory criada corretamente
- Invoice criado com amount correto
- currentPlanId atualizado

**Edge Cases:**
- Múltiplos upgrades em mesmo ciclo
- Upgrade no último dia do ciclo
- Cliente com ciclo anual
- Upgrade quando invoice anterior ainda pendente

### 5.2 Validação com Asaas

Antes de ir para prod:
- Testar POST /payments com novo amount
- Validar webhook de confirmação
- Testar cancelamento de payment (se usar)
- Verificar se prorating é aplicado corretamente no painel Asaas

---

## 6. Performance

### 6.1 Operações na Criação de Projeto

```
1. Contar projetos do usuário:
   SELECT COUNT(*) FROM Project WHERE userId = ?
   → O(1) com índice

2. Buscar subscription:
   SELECT FROM BillingSubscription WHERE userId = ?
   → O(1) com índice

3. Buscar currentPlan (via currentPlanId cache):
   SELECT FROM BillingPlan WHERE id = ?
   → O(1)

4. Detectar upgrade (comparação em memória):
   if (projectCount > plan.includedProjects)
   → O(1)

5. Criar BillingPlanHistory:
   INSERT INTO BillingPlanHistory (...)
   → O(1)

6. Criar BillingInvoice:
   INSERT INTO BillingInvoice (...)
   → O(1)

Total: 5-6 queries, zero loops, ~50ms esperado
```

### 6.2 Considerar Índices

```sql
-- Já devem existir:
CREATE INDEX idx_subscription_user ON BillingSubscription(organizationId);
CREATE INDEX idx_project_user ON Project(organizationId);
CREATE INDEX idx_plan_history_subscription ON BillingPlanHistory(subscriptionId, startedAt DESC);
```

---

## 7. Achados Importantes do Sistema Atual

### 7.1 BillingInvoice.value é Float (⚠️ PROBLEMA)

**Estado atual:**
```prisma
model BillingInvoice {
  value    Float
}
```

**Problema:**
- Float não é preciso para valores monetários
- Pode causar erros de arredondamento acumulados
- Crítico para prorating (que multiplica por frações de dias)

**Solução:** 
- Mudar para `Decimal @db.Decimal(10, 2)` antes de implementar prorating
- Migration simples, sem risco (Cast Float → Decimal)
- Evita surpresa de valores imprecisos no futuro

**Ação:** Adicionar mudança à migration (Task 1.4)

### 7.2 syncOrganizationSubscriptionItems Já Calcula Extras

**Descoberta:** Função já existe e calcula:
- `includedProjects` vs `activeProjects`
- `additionalProjects` (a diferença)

**Implicação:**
- Hook perfeito para trigger de auto-upgrade
- Reutilizar lógica existente (DRY)
- Apenas expandir com upgrade automático

**Código atual:**
```typescript
export async function syncOrganizationSubscriptionItems(organizationId: string) {
  // Busca subscription
  // Calcula entitlements
  // Retorna números (não faz upgrade)
}
```

### 7.3 BillingSubscription Não Tem currentPlanId (Será Adicionado)

**Estado:** Plano atual só é acessível via `subscription.offer.plan`

**Melhoria:** Adicionar cache `currentPlanId` para queries mais rápidas

**Razão:** Dashboard precisa ser rápido (~50ms)

### 7.4 PIX Está Integrado (Deixar Como Está)

**Descoberta:** Colunas de PIX estão no schema:
- `pixAutomaticAuthId`
- `pixQrCode`, `pixQrCodePayload`, `pixQrCodeImage`, `pixExpirationDate`
- `pixEmailSentAt`, `pixWhatsappSentAt`, `pixResendCount`

**Ação:** NÃO remover (causaria migration complexa)

**Solução:** Apenas não usar na nova lógica, documentar como "futuro"

### 7.5 Trial Funciona com trialEndsAt

**Entendimento:** Trial tem limite de 1 projeto, controlado em `assertProjectCreationAllowed`

**Com auto-upgrade:**
- Quando sai do trial, passa para plano pago
- BillingPlanHistory criada (reason: `trial_to_paid`)
- Limite é liberado para o plano

---

## 8. Questões em Aberto

| Questão | Resposta | Impacto |
|---------|----------|--------|
| Bloquear cliente acima de Business? | Não (deixar crescer) | Relatório de vendas |
| Auto-downgrade quando deleta projeto? | Não (futuro) | Cliente paga mais |
| Suporte a multiple payment methods? | Sim (cartão + PIX) | Prorating vale para ambos |
| Notificação em-app + email? | Apenas email agora | Pode melhorar depois |

---

## 8. Critérios de Aceitação Técnica

- ✅ Prorating preciso até 2 casas decimais
- ✅ Auto-upgrade detectado < 100ms
- ✅ Invoice criado < 1s
- ✅ 100% de cobertura de testes (casos principais + edges)
- ✅ BillingPlanHistory nunca deletado (auditoria)
- ✅ Dashboard mostra plano corrente com 100% de acurácia
- ✅ Email enviado assincronamente (não bloqueia)

