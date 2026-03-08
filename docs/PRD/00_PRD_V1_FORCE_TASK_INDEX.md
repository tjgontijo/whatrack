# PRD V1 Launch Index

## Contexto

Este conjunto de PRDs substitui o planejamento antigo arquivado em `docs/PRD/discontinued`.

Base de verdade:

- o que está implementado hoje em `src/`
- as integrações e fluxos que já compilam, testam e aparecem no produto
- a decisão atual de negócio: lançar a V1 amanhã com IA no escopo

Decisões fechadas:

- IA permanece no launch
- o launch deve refletir o comportamento real do produto, não a ambição histórica
- cancelamento de billing continua sendo controlado pelo app porque a AbacatePay v1 não expõe endpoint oficial de cancelamento
- o scheduler oficial da V1 será externo via `n8n`, não o cron nativo da Vercel free
- todo documento ativo daqui para frente deve estar alinhado com o código atual

## Domínios Ativos

0. `00_PRD_V1_FORCE_TASK_INDEX.md`
1. `01_PRD_V1_DOMAIN_RELEASE_OPERATIONS.md`
2. `02_PRD_V1_DOMAIN_SCHEDULING_N8N.md`
3. `03_PRD_V1_DOMAIN_BILLING.md`
4. `04_PRD_V1_DOMAIN_WHATSAPP.md`
5. `05_PRD_V1_DOMAIN_AI_COPILOT.md`
6. `06_PRD_V1_DOMAIN_META_ADS.md`
7. `07_PRD_V1_DOMAIN_ACQUISITION_AUTH_ONBOARDING.md`
8. `08_PRD_V1_DOMAIN_CRM_OPERATIONS.md`

## Leitura Real do Produto

Hoje o produto entregue é:

- landing + auth + onboarding de organização
- billing com checkout, webhook, assinatura e metering
- operação de WhatsApp com inbox, webhook, templates e onboarding
- integração Meta Ads com campanhas, insights e CAPI
- IA Copilot com sugestões, aprovação manual e AI Studio
- operação comercial com leads, tickets, vendas, itens, categorias e dashboards

O risco principal do launch não é falta de feature. O risco é falta de fechamento operacional e corte de superfície.

## Ordem da Força-Tarefa

1. `Release Operations`
   - limpar endpoints internos e fechar superfície pública
   - alinhar docs operacionais com o comportamento real
   - confirmar variáveis e jobs obrigatórios
2. `Scheduling N8N`
   - assumir scheduler externo como fonte de verdade da V1
   - definir jobs, frequências, secrets e contrato HTTP
   - remover ambiguidade entre scheduler antigo e contrato oficial
3. `Billing`
   - validar checkout, webhook, status e cancelamento app-side
   - aplicar migration/seed pendentes se ainda não estiverem aplicados
4. `WhatsApp`
   - validar onboarding, webhook, conta ativa e recebimento de mensagens
5. `AI Copilot`
   - garantir execução do classificador
   - validar fluxo sugestão -> aprovação -> venda -> CAPI
6. `Meta Ads`
   - validar OAuth, campanhas, insights e rastreio de conversão
7. `Acquisition/Auth/Onboarding`
   - validar fluxo landing -> cadastro/login -> organização -> área logada
8. `CRM Operations`
   - validar consistência entre leads, tickets, vendas e catálogo

## Gate de Go/No-Go

O launch só é `go` amanhã se os itens abaixo estiverem completos:

- nenhum endpoint de debug/teste exposto sem necessidade de produção
- scheduler externo configurado no `n8n` com horários e secrets corretos
- webhook de billing recebendo evento real e atualizando assinatura
- job de IA agendado e autenticado
- fluxo completo de onboarding e compra validado manualmente
- fluxo completo WhatsApp -> IA -> aprovação -> venda validado manualmente
- integração Meta Ads conectada com conta real de teste
- documentação operacional curta e atualizada para suporte do dia 1

## Resultado Esperado de Hoje

Ao fim da força-tarefa, cada domínio deve ter:

- escopo de V1 fechado
- gaps reais priorizados
- checklist objetiva de execução
- critério de aceite claro para amanhã
