# PRD-008: Dados Brutos de Conversa e Negociação

## Resumo

Criar um endpoint e painel de dados que exponha **fatos brutos** de conversas de WhatsApp e negociações na inbox, sem interpretação. Os dados são exibidos em um acordeão colapsável no painel lateral (3ª coluna da inbox), permitindo que o operador leia o contexto objetivamente.

Este PRD não interpreta, não classifica, não recomenda. Ele coleta e exibe. A interpretação é responsabilidade do PRD-009 (agentes de IA).

## Escopo

- Normalizar e expor dados de `Conversation`, `Deal`, `Lead` e `DealTracking` em um endpoint read-only.
- Calcular derivações matemáticas simples: tempo decorrido (diffs de timestamp), ratios de mensagem.
- Exibir os dados brutos em um acordeão colapsável no `DealPanel` da inbox.
- Servir como fonte de contexto estruturado para o PRD-009.

## Fora de Escopo

- Qualquer forma de interpretação, classificação ou scoring.
- Labels de status: "within_sla", "late", "cold", "hot", "stale", "waiting".
- Ações recomendadas.
- Business hours / horário comercial.
- Thresholds e constantes de SLA.
- Snapshot / persistência de histórico.
- Alertas ou notificações.
- Mudança automática de estágio.
- Envio de mensagens.

## Entregas

1. Schema Zod do DTO de dados brutos.
2. Repository com queries tenant-scoped.
3. Service que computa diffs e ratios.
4. Endpoint GET read-only.
5. Componente acordeão no `DealPanel`.
6. Testes unitários do service.

## Estimativa

MVP completo: 24h a 32h.

## Relação com PRD-009

O PRD-009 consome o DTO deste PRD como contexto estruturado. A IA interpreta os fatos — não os recalcula.
