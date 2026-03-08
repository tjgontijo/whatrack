# PRD V1 Domain: AI Copilot

## Objetivo

Lançar a IA como parte oficial da V1, com foco em análise de conversa, geração de sugestão e aprovação humana para fechamento operacional.

## Estado Implementado Hoje

Base já existente no código:

- fila de aprovações em `src/app/dashboard/approvals/page.tsx`
- aprovação de insight em `src/services/ai/ai-insight-approval.service.ts`
- rotas de insights em `src/app/api/v1/ai-insights`
- agentes e AI Studio em `src/app/dashboard/settings/ai/page.tsx`
- execução de IA em `src/services/ai/ai-execution.service.ts`
- agendamento em `src/services/ai/ai-classifier.scheduler.ts`
- endpoint oficial de cron em `src/app/api/v1/cron/ai/classifier/route.ts`

## Verdade Operacional Atual

- a IA já está no produto e influencia resultado de negócio
- o fluxo mais robusto hoje é `sugestão -> aprovação humana -> venda/ticket/CAPI`
- o job de classificação existe, mas depende de agendamento operacional explícito
- por limitação prática do plano gratuito da Vercel, a V1 usará `n8n` como scheduler oficial

## Escopo Oficial da V1

Entra no launch:

- IA qualificando conversas
- geração de sugestões de aprovação
- aprovação manual pelo operador
- criação de venda e sinalização Meta Ads a partir da aprovação

Fica fora do esforço de hoje:

- narrativa de IA totalmente autônoma
- automações complexas que dispensem aprovação humana
- expansão de Studio como frente comercial principal

## Gaps Reais

- `ai/classifier` precisa ser agendado no `n8n`
- a copy pública precisa vender IA assistida e confiável, não autonomia exagerada
- é obrigatório validar o fluxo com conversa real antes do launch

## Tarefas de Hoje

1. Configurar o job do classificador no `n8n` com frequência curta usando `POST https://whatrack.com/api/v1/cron/ai/classifier`.
2. Confirmar secret e autenticação do job.
3. Validar fluxo `mensagem -> classificação -> sugestão -> aprovação -> venda`.
4. Validar que a aprovação fecha ticket e registra venda corretamente.
5. Rebaixar o AI Studio para papel secundário se ele não for essencial no dia 1.
6. Assumir `POST /api/v1/cron/ai/classifier` como endpoint oficial da produção.

## Critérios de Aceite

- job roda no intervalo esperado
- nova conversa elegível gera sugestão
- operador aprova e o sistema fecha ticket e registra venda
- o endpoint oficial de cron da IA está claro para a operação
- o produto não promete autonomia que não existe no fluxo oficial

## Riscos de Launch

- sem job ativo, a IA vira feature “morta” no dia 1
- se o time configurar o endpoint errado, a IA pode parecer intermitente mesmo com código correto
- se a aprovação quebrar venda ou CAPI, a confiança na IA cai imediatamente
