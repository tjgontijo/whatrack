# PRD V1 Domain: Meta Ads and Attribution

## Objetivo

Conectar a origem do tráfego ao resultado comercial e devolver sinais de conversão úteis para o Meta Ads.

## Estado Implementado Hoje

Base já existente no código:

- conexão OAuth em `src/app/api/v1/meta-ads/connect/route.ts`
- callback em `src/app/api/v1/meta-ads/callback/route.ts`
- campanhas em `src/app/api/v1/meta-ads/campaigns/route.ts`
- insights em `src/app/api/v1/meta-ads/insights/route.ts`
- dashboard em `src/app/dashboard/meta-ads/page.tsx`
- configurações em `src/app/dashboard/settings/meta-ads/page.tsx`
- integração CAPI via `src/services/meta-ads/capi.service.ts`

## Escopo Oficial da V1

Entra no launch:

- conexão com conta de anúncios
- leitura de campanhas e indicadores principais
- visualização de ROI e dados de campanha
- envio de sinais relevantes de conversão ao Meta Ads

Fica fora do esforço de hoje:

- expansão analítica não essencial para o dia 1
- promessas de atribuição perfeita sem validação operacional

## Gaps Reais

- falta validar o fluxo OAuth e seleção de conta no ambiente final
- falta validar que CAPI realmente recebe os sinais esperados da operação
- falta confirmar que a leitura de campanhas e insights usa credenciais válidas em produção

## Tarefas de Hoje

1. Conectar uma conta real de teste.
2. Validar carregamento de campanhas e insights no dashboard.
3. Validar evento de conversão disparado a partir de uma aprovação real da IA ou fluxo equivalente.
4. Confirmar pixel, conta e permissões mínimas da integração.
5. Registrar quais telas de Meta Ads entram oficialmente no launch e quais ficam só como base interna.

## Critérios de Aceite

- conta conecta e persiste
- campanhas e insights carregam dados válidos
- pelo menos um evento de conversão de teste chega com sucesso ao Meta
- a narrativa comercial de atribuição bate com o que a operação realmente mede

## Riscos de Launch

- integração Meta sem validação real cria promessa central sem prova
- permissões quebradas no OAuth travam o valor percebido do produto rapidamente
