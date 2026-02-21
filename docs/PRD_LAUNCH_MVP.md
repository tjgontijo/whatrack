# WhaTrack - Lançamento Core (MVP de Validação em 2 Dias): PRD v1

## Visão Geral

O objetivo principal deste escopo é garantir um rápido **Speed-to-Market** (Go-Live) nas próximas 48 horas.
Nesta fase, funcionalidades periféricas, cadastros complexos (Produtos/Inventário), OCRs multicanal ou métricas avançadas devem ser congelados em favor do _Core Loop_ estabelecido.

O _Core Loop_ que os clientes comprarão neste MVP é:
> **Conectar seu WhatsApp ao sistema → Nós rastreamos UTMs e UTMs convertidos → Quando uma venda acontece (via IA ou manual), o Facebook CAPI recebe o evento.**

---

## 1. Escopo Trava do MVP (Funcionalidades Mandatórias)

Para os primeiros Betas utilizarem, estes módulos precisam estar estabilizados na versão de produção:

### A. Integração com WhatsApp (Official Cloud API)
- Onboarding em 1-click via Meta Embedded Signup livre de erros de carregamento e UX.
- Funcionamento bilateral: o sistema espelha (lê) mensagens ativamente trocadas no WhatsApp Business pelo usuário logado sem quebras.
- Sincronização automática para reabertura de contadores de janela de 24h para cada `INBOUND`.

### B. Funcionalidade de Inbox e Real-time
- A tela `/dashboard/whatsapp/inbox` não pode possuir refresh de página. Recebimento de texto com base no Centrifugo/Websockets em tempo real é crítico.
- Histórico visual legível de Inbound e Outbound (já validado no painel).

### C. Integração com Meta Ads (O Valor Real)
- Autenticação com o Facebook completa.
- Retenção do token de autenticação em banco.
- Despacho da `Sale` validada (originada pelo Mastra AI Copilot ou por fechamento manual no `TicketPanel`) para o end-point da CAPI (`Purchase` e `Lead`).
- Confirmação do histórico (Tabela `MetaConversionEvent`) para assegurar que não haja perdas em requisições rejeitadas por WABA, ctwaclid ou Payload invalido.

### D. Billing / Pagamento
- (Estratégia A) Implementar integração Strips checkout rápido (Billing portal).
- (Estratégia B) Criação de uma Role provisória "Trial" e controle de validade do SaaS sem catraca (Mais recomendado pelo prazo).

---

## 2. Tarefas Excluídas do Escopo (Não Fazer Agora)

Devem ser adiadas para ciclos de desenvolvimento V2 ou V3:
1. **Catálogo de Produtos:** Gerenciamento de SKU, estoques ou variações de produto.
2. **Dashboard de Faturamento Avançado:** Gráficos com comparativos mensais; bastam dados de leads gerados e total fechado.
3. **OCRs/Flashcards:** Todo processamento paralelo do Instagram que fuja ao fluxo nativo da API.
4. **App Desktop/Mobile Nativo:** O produto deve rodar primariamente Web responsivo.
5. **Automação de Respostas (Chatbots):** A IA atua na "leitura", mas **não** escreve para os clientes para evitar banimento ou comportamento instável, todas as mensagens partem apenas da secretária da clínica.

---

## 3. Checklist de Lançamento (Go-Live)

| Item | Status | Responsável |
|------|--------|-------------|
| 1. Ambiente Vercel config. e Redis online | Pending | Infra/Ops |
| 2. DB Migration up-to-date em Produção | Pending | Backend |
| 3. Meta App Review e URL Privacidade Pública | Pending | Documentação |
| 4. Fix do `MetaConnection` e Tokens | Pending | Backend |
| 5. Aprovações de Venda CAPI linkada e Funcional | Pending | Frontend |
| 6. Setup da Landing Page final e DNS (`.com.br`) | Pending | Frontend |

---

## 4. O Fluxo de CAPI (Detalhe Crucial ao MVP)

Quando uma venda é fechada, seja através do clique do Gestor no Kanban (`/dashboard/tickets`), pelo Panel lateral (`TicketPanel`) ou pelo Aprovação da IA Copilot, o sistema opera o fluxo:

1. Função `sendEvent` (`capi.service.ts`) recupera o `pixel_id` da Organização associada.
2. Identifica se a Ticket tem `ticket.tracking.ctwaclid` ou `.metaAdId` (Recolhidos da Mensagem original de Ads Referral).
3. Payload de CAPI montado (Custom Data contendo `value` e `currency=BRL`).
4. Resulta em registro no Banco `MetaConversionEvent` salvando `fbtraceId` retornado (para debug de sucesso).

Este é o pulso cardíaco do Whatrack e sua garantia de eficiência total em 2 dias.
