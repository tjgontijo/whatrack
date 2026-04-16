# Contexto: Billing Simplification

## Princípio do MVP

O primeiro objetivo não é fechar o desenho comercial final do Whatrack. O primeiro objetivo é colocar no ar um billing funcional, brasileiro e previsível.

Por isso, o MVP adota o mesmo desenho operacional do `kadernim`:

- catálogo pequeno
- Asaas como único gateway
- checkout transparente
- webhook como fonte de verdade para confirmação de pagamento

---

## Escopo Comercial do MVP

### Produto Self-Serve

No MVP existe um único produto self-serve do Whatrack.

Operacionalmente ele é representado por dois planos de cobrança:

| `BillingPlan.code` | Ciclo | Objetivo |
|--------------------|-------|----------|
| `monthly` | mensal | entrada mais simples |
| `annual` | anual | ticket maior com desconto |

Cada plano possui ofertas ativas por método de pagamento:

| `BillingOffer.code` | Método | Observação |
|---------------------|--------|-----------|
| `monthly_credit_card` | cartão | recorrência automática |
| `monthly_pix_automatic` | PIX Automático | recorrência mensal com autorização |
| `annual_credit_card` | cartão | pagamento único |
| `annual_pix` | PIX | pagamento único |

### O Que Não Faz Parte Desta Fase

- múltiplos tiers comerciais
- quotas por projeto
- upsell automático
- add-ons
- proration
- upgrade/downgrade self-serve
- PIX manual no mensal

---

## Regras de Negócio

### 1. Billing é por organização

No Whatrack, a unidade de cobrança é a `organization`.

O checkout é iniciado por um usuário autenticado, mas:

- `subscription` pertence à organização
- `invoice` pertence à organização
- customer do Asaas deve ser resolvido com os dados de cobrança da organização

### 2. Cartão é a modalidade principal

No MVP, cartão de crédito é a modalidade foco do Whatrack.

Isso implica:

- checkout abre com cartão selecionado por padrão
- copy, hierarchy e CTA priorizam cartão
- testes de regressão priorizam cartão
- rollout em produção depende primeiro da estabilidade do fluxo de cartão

### 3. Separação entre plano e oferta

O plano representa o ciclo comercial.

A oferta representa como esse plano é comprado.

Exemplo:

- `monthly` é o plano
- `monthly_pix_automatic` e `monthly_credit_card` são ofertas

Essa separação simplifica:

- preço por método
- ativação/desativação de meios de pagamento
- futuras promoções por oferta, sem redesenhar o plano

### 4. Checkout Transparente é obrigatório

O fluxo do MVP não usa checkout hospedado por terceiro como experiência principal.

Requisitos:

- seleção de plano e método dentro do app
- coleta de nome, email, telefone e CPF/CNPJ dentro do Whatrack
- coleta de dados de cartão dentro do Whatrack quando o método for cartão
- backend chama o Asaas e retorna o resultado do checkout

### 5. PIX manual fica restrito ao anual

No MVP, `PIX` manual só aparece quando o usuário escolhe o plano anual.

Quando o método é `PIX` anual, o backend deve devolver:

- `invoiceId`
- `qrCodePayload`
- `qrCodeImage`
- `expirationDate`
- `statusToken` para polling seguro de status

Isso permite:

- exibir QR Code na tela
- oferecer copia e cola
- acompanhar pagamento sem recarregar a página

### 6. PIX Automático é o caminho em PIX para o plano mensal

Para o MVP:

- `monthly_pix_automatic` usa o fluxo de autorização do Asaas
- o frontend recebe um `statusToken` para acompanhar a autorização
- eventos de autorização e confirmação ativam a subscription
- eventos de recusa, expiração ou cancelamento atualizam a subscription local

### 7. Cartão ativa a recorrência apenas onde fizer sentido

- `monthly_credit_card` usa recorrência automática do Asaas
- `annual_credit_card` é cobrança única

O comportamento acima replica o desenho mais simples já validado no `kadernim`.

### 8. Não existe PIX manual para renovação mensal

- o plano mensal não oferece QR Code PIX manual como opção principal
- `monthly_pix_automatic` é a única opção em PIX para mensal
- `annual_pix` continua disponível como cobrança única

---

## Ciclo de Vida da Assinatura

```text
INACTIVE -> PENDING -> ACTIVE -> OVERDUE -> CANCELED
```

### Regras

- `PENDING`: cobrança criada, aguardando confirmação
- `ACTIVE`: pagamento confirmado e acesso liberado
- `OVERDUE`: cobrança vencida sem pagamento
- `CANCELED`: assinatura encerrada

O estado final deve ser dirigido pelo webhook do Asaas.

---

## Fluxos de Usuário

### Fluxo PIX Automático (Mensal)

```text
1. Usuário abre a tela de billing
2. Escolhe monthly
3. Escolhe PIX Automático
4. Informa dados de cobrança
5. Backend cria autorização no Asaas
6. Frontend consulta status da autorização
7. Webhook confirma autorização/ativação
8. Subscription fica ACTIVE
```

### Fluxo PIX (Anual)

```text
1. Usuário abre a tela de billing
2. Escolhe annual
3. Escolhe PIX
4. Informa dados de cobrança
5. Backend cria payment no Asaas
6. Frontend exibe QR Code + copia e cola
7. Frontend consulta status
8. Webhook confirma pagamento
9. Subscription fica ACTIVE
```

### Fluxo Cartão

```text
1. Usuário abre a tela de billing
2. Escolhe monthly ou annual
3. Escolhe cartão
4. Informa dados de cobrança e cartão
5. Backend cria subscription ou payment no Asaas
6. Frontend recebe status inicial
7. Webhook confirma pagamento
8. Subscription fica ACTIVE
```

Este é o fluxo padrão da experiência.

---

## UX Mínima Esperada

### Tela de Checkout

Deve conter:

- seletor de ciclo
- seletor de método de pagamento
- dados do responsável pela cobrança
- CPF/CNPJ
- campos do cartão quando aplicável
- resumo do valor
- regra de métodos por plano:
  - `monthly`: cartão ou PIX Automático
  - `annual`: cartão ou PIX
- cartão selecionado por padrão
- destaque visual e textual para cartão

### Tela PIX Automático

Deve conter:

- estado da autorização
- instrução clara de confirmação
- indicador de processamento
- polling de status

### Tela PIX

Deve conter:

- QR Code
- código copia e cola
- valor
- validade
- indicador de status

### Tela de Status

Deve conter:

- plano atual
- método de pagamento
- status da assinatura
- vencimento

No MVP, gestão avançada de troca/cancelamento pode continuar manual.

---

## O Que Este PRD Não Decide

Este PRD não fecha:

- preço final do produto
- estratégia de desconto
- limites por projeto
- políticas de upgrade
- automações de cobrança além do necessário para o primeiro checkout
