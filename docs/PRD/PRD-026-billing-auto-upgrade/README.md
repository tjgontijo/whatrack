# PRD-026: Auto-Upgrade de Planos e Histórico de Billing

**Status:** Draft  
**Data:** 2026-04-16  
**Versão:** 1.0

---

## O Que Este PRD Define

Este PRD refina o modelo de billing atual para implementar:

1. **Auto-upgrade automático** quando cliente cria projetos além do limite do plano
2. **Histórico completo** de todas as mudanças de plano (com auditoria)
3. **Novo invoice** gerado quando há upgrade
4. **Ajuste comercial:** Business plan de 10 → 5 projetos inclusos

Mantém o foco no modelo atual de Asaas, simplesmente automatizando o fluxo de escalação que hoje é manual.

---

## Resumo Executivo

### Objetivo

- Eliminar cobranças manuais quando cliente usa projetos extras
- Gerar novo invoice automaticamente ao fazer upgrade
- Manter auditoria clara de quando/por que cada plano foi ativo
- Ajustar Business plan para 5 projetos (comercial)

### Problema Atual

- Cliente cria projetos além do limite → sistema marca como "adicional" mas **não cobra**
- Sem histórico de mudanças de plano → impossível auditar evolução do cliente
- Upgrade deve ser detectado e processado no momento da criação do projeto

### Novo Escopo

**Entra:**

- Tabela `BillingPlanHistory` para rastreamento de mudanças
- Lógica automática de detecção de upgrade na criação de projeto
- Novo invoice gerado no upgrade (com prorating)
- Business plan: 10 → 5 projetos
- Campo `currentPlanId` em `BillingSubscription` (cache rápido)
- Email de notificação ao fazer upgrade

**Fica fora do escopo:**

- Downgrade automático
- Bloquei de projetos (cliente sempre consegue criar)
- PIX (apenas cartão de crédito)
- UI de histórico (apenas backend nesta fase)
- Webhook de plano ou sincronização com Asaas de novos planos

---

## Estrutura do Pacote

```text
PRD-026-billing-auto-upgrade/
|-- README.md          (este arquivo)
|-- CONTEXT.md         (fluxos, regras e casos de uso)
|-- DIAGNOSTIC.md      (decisões técnicas, riscos, prorating)
|-- TASKS.md           (backlog de implementação)
`-- MIGRATION.md       (mudanças no schema e seeds)
```

---

## Conceitos Principais

### Plano Corrente (Current Plan)

Cada subscription tem **um único plano ativo** em cada momento. Quando:

```
Projetos do cliente > Limite do plano corrente
  → Auto-upgrade para o menor plano que comporta
  → Novo invoice gerado (prorated)
  → Entrada criada em BillingPlanHistory
```

### Histórico de Planos

Tabela `BillingPlanHistory` registra:
- Qual plano era vigente
- Data de início e fim
- Razão da mudança (manual, auto_upgrade, downgrade)
- Quantos projetos o cliente tinha no momento
- Link para subscription e plan

### Prorating

Quando há upgrade no meio do ciclo:
- Crédito do plano antigo (dias restantes × valor dia)
- Cobrança do novo plano (dias restantes × valor dia)
- Próximo ciclo segue normalmente

---

## Fluxo Principal

```
Cliente cria projeto
  ↓
Sistema conta: total de projetos vs. limite do plano
  ↓
N projetos > limite?
  ├─ SIM → Encontra menor plano que comporta
  │         Cria BillingPlanHistory (auto_upgrade)
  │         Cria novo BillingInvoice (prorated)
  │         Atualiza currentPlanId
  │         Envia email de notificação
  │
  └─ NÃO → Apenas cria projeto (sem ação de billing)
  ↓
Projeto criado com sucesso
```

---

## Modelo de Referência

Reutiliza padrão atual:
- `BillingPlan` (planos como Starter, Pro, Business)
- `BillingOffer` (ofertas por método de pagamento — cartão apenas)
- `BillingSubscription` (assinatura ativa do cliente)
- `BillingInvoice` (faturas geradas)

**Novo:**
- `BillingPlanHistory` (rastreamento de mudanças)
- `BillingPlanInvoice` (componente UI que exibe detalhes do plano vigente)

---

## Como Ler Este Pacote

**Ordem recomendada:**

1. **README.md** (este arquivo) — visão geral
2. **DISCOVERY.md** — achados do sistema atual (O QUE EXISTE)
3. **CONTEXT.md** — fluxos, regras, casos de uso (O QUE VAI VIRAR)
4. **DIAGNOSTIC.md** — decisões técnicas, riscos, prorating (COMO FAZER)
5. **TASKS.md** — backlog de implementação (PASSO A PASSO)
6. **MIGRATION.md** — schema changes, migrations, seeds (SQL/PRISMA)

---

## O Que Mudou na Revisão

✅ **Integrado ao sistema atual:**
- Reusar `syncOrganizationSubscriptionItems` como hook
- Adicionar cache `currentPlanId` (sem quebrar queries existentes)
- Nova tabela `BillingPlanHistory` (append-only, zero impacto)

✅ **Problemas evitados:**
- Descoberto Float em BillingInvoice → corrigindo para Decimal antes
- PIX integrado → deixar como está, documentado como futuro
- Trial com limite de 1 projeto → compatível com auto-upgrade

✅ **Design atualizado:**
- Invoice do plano agora SaaS-style (progress bar, features limpo)
- Apenas cartão de crédito (PIX futuro, documentado)

---

## Próximo Passo

Ler **DISCOVERY.md** para entender o que existe hoje e como será integrado.
