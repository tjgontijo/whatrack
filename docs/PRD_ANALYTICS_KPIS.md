# WhaTrack - CRM KPIs & Analytics (No-LLM): PRD v1

## Visão Geral

Este documento descreve a arquitetura e a estratégia de KPIs (Key Performance Indicators) nativos do CRM, projetados para entregar alto valor analítico (velocidade, conversão, esforço) baseando-se puramente em matemática relacional e eventos do sistema. O objetivo é economizar os custos de inferência de IA (LLMs) usando-a apenas para tarefas dialógicas complexas e de classificação, enquanto a inteligência operacional roda gratuitamente via SQL e webhooks.

---

## 🟢 O que já foi implementado (Fase 1: Fundação)

A estrutura fundacional de dados e a interface micro/operacional (visão do vendedor) já estão ativas.

### 1. Modelo de Dados (Prisma)
Adicionamos colunas de acompanhamento em tempo real diretamente nas entidades transacionais principais:

**Tabela `Lead` (Histórico e Valor)**
- \`firstMessageAt\` (DateTime): Marca o início do ciclo de vida do cliente.
- \`totalTickets\` (Int): Contagem total de vezes que o lead entrou no funil.
- \`lifetimeValue\` (Decimal): Soma histórica de todo o \'dealValue\' ganho.

**Tabela `Conversation` (Termômetro da Sessão da API)**
- \`unreadCount\` (Int): Balão de mensagens não lidas.
- \`inboundMessagesCount\` / \`outboundMessagesCount\` (Int): Volume de tráfego.
- \`lastInboundAt\` / \`lastOutboundAt\` (DateTime): Marcadores de inatividade.
- \`avgResponseTimeSec\` (Int): Média de tempo de resposta da equipe naquela conversa.

**Tabela `Ticket` (SLA e Esforço por Negócio)**
- \`inboundMessagesCount\` / \`outboundMessagesCount\` (Int): Esforço dedicado à Venda específica.
- \`firstResponseTimeSec\` (Int): SLA Crítico - Tempo exato até a primeira mensagem humana/bot após a abertura.
- \`resolutionTimeSec\` (Int): Tempo desde a criação até o fechamento (Ganha/Perdida).

### 2. Back-end / APIs
- A rota \`GET /api/v1/conversations/:id/ticket\` foi expandida para incluir o nó \`kpis\` e \`leadInsights\`, retornando as contagens instantaneamente.

### 3. Front-end (Inbox UI)
- O componente \`TicketPanel\` no lado direito do Inbox recebeu atualizações premium.
- **Card "Dossiê do Atendimento"**: Mostra visualmente o volume da conversa (Cliente vs Clínica), relógio de 1ª Resposta e relógio de Resolução.
- **Card "Histórico do Cliente"**: Traz a contagem de oportunidades iniciais e um bloco verde de destaque com o \`Lifetime Value (LTV)\` contendo o montante total gasto em R$.

---

## 🟡 O que falta implementar (Fase 2: Motor e Macro-Visão)

Temos a carenagem e o tanque. Falta o motor para girar as rodinhas e o painel diretivo.

### 1. Motor de Eventos Inbound / Outbound (Webhooks)
Os novos campos estão vazios (\`0\` ou \`null\`). Precisamos de um listener que reaja aos pings do WhatsApp. No Webhook de Inbound/Outbound:
- **Ao receber mensagem (Inbound):**
  - \`ticket.inboundMessagesCount + 1\`
  - \`ticket.lastInboundAt = now()\`
  - Se for a primeiríssima mensagem: \`lead.firstMessageAt = now()\`
- **Ao enviar mensagem (Outbound):**
  - \`ticket.outboundMessagesCount + 1\`
  - \`ticket.lastOutboundAt = now()\`
  - Se \`firstResponseTimeSec\` for nulo: \`firstResponseTimeSec = now() - ticket.createdAt\`

### 2. Motor de Fechamento de Negócios (SLA e LTV)
Quando a vendedora ou a IA muda o ticket para \`closed_won\`:
- Calcular e cravar o \`resolutionTimeSec = now() - ticket.createdAt\`.
- Somar o valor da venda ao \`lead.lifetimeValue = lead.lifetimeValue + ticket.dealValue\`.
- \`lead.totalTickets + 1\`.

### 3. Dashboard Gerencial / Analítico (Front-end Global)
Uma tela isolada (ex: `/dashboard/analytics`) recheada com gráficos \`Nivo\` rodando em cima dos dados agregados:
- **Taxa de Conversão**: Tickets Abertos vs Ganhos por Estágio.
- **Tempo Médio de Atendimento (SLA)**: Painel do gestor focando nos maiores tempos de \`firstResponseTimeSec\`.
- **Heapmap de Horários**: Um "mapa de calor" agrupando as \`inboundMessages\` pelas 24 horas do dia, mostrando quando a clínica recebe mais leads.
- **Gráfico de Esforço R$/Msg**: O cruzamento do \`(inbound+outbound)\` dividido pelo \`dealValue\`, calculando a eficiência da equipe de vendas em fechar tickets com menos papo.
- **Termômetro do Lead (Status Visuais das Conversas)**: Transformar o gap do \`lastInboundAt\` em uma barra verde de "Lead Escrevendo / Online" lá na fila de chamadas.

### 4. Background Jobs (Inatividade Opcional)
Um worker em Redis ou similar que roda de hora em hora. Se achar um Ticket \'open\' em que o \`lastOutboundAt\` (da clínica) ocorreu há mais de 24 horas do \`lastInboundAt\` (do cliente), marca com a flag/tag "Lead Esquecido".
