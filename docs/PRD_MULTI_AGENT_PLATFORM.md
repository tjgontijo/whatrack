# PRD: Plataforma Multi-Agentes de Automação e Inteligência de Conversão (Copilot 2.0)

## 1. Visão Geral e Objetivo: Além do CRM
O Whatrack não é um CRM tradicional. Enquanto CRMs são repositórios estáticos e reativos de dados, o Whatrack se posiciona como um **Sistema Operacional de Conversão (Conversion OS)** ou um **Hub de Inteligência em Receita (Revenue Intelligence Hub)**. Ele integra ativamente a jornada desde o clique no anúncio do Meta Ads até o fechamento no WhatsApp, fechando o ciclo de retroalimentação.

O objetivo do Copilot 2.0 é introduzir uma **Plataforma de IA Componível**, transformando o Whatrack em um ecossistema onde diretores e coordenadores podem criar e conectar **múltiplos agentes de Inteligência Artificial especializados (Copilotos)** para auditar, intervir, enriquecer e otimizar toda a operação de receita, sem depender de configuração técnica ou hardcode.

### 1.1 Casos de Uso Esperados (O novo paradigma)
Para materializar essa visão além de um "gestor de contatos", os agentes de IA podem atuar como uma força de trabalho invisível e hiperescalável da empresa:

1. **Otimizador de Tráfego e Loop de Feedback (Traffic Feedback AI):** Analisa o teor das conversas perdidas e as correlaciona com tags UTM/CTWACLID. O agente alerta o Gestor de Tráfego: *"A Campanha 'Agosto_Botox' gastou R$500 hoje, mas 80% das conversas reclamaram do preço. O público está desqualificado para o ticket da clínica."*
2. **Coach ao Vivo de Objeções (Live Closing Coach):** Dispara durante a conversa quando detecta hesitação. O agente sopra em texto oculto para o vendedor: *"O lead está preocupado com o tempo de recuperação. Diga a ele sobre nosso método a laser que reduz o inchaço e ofereça bônus de retorno."*
3. **Mapeador de ICP e Micro-Segmentação:** Lê o término de cada venda ganha e extrai variáveis psicológicas e demográficas ocultas na conversa ("Mãe de primeira viagem", "Empresário sem tempo"). Esses dados são devolvidos ao Meta via CAPI para buscar "pessoas com esse exato perfil psicológico".
4. **Sentinela de Churn/Ghosting:** Escaneia ativamente conversas "esfriando". Quando a IA detecta que um lead engajado está prestes a sumir (ghosting), sugere a melhor mensagem de resgate ou joga automaticamente o lead em uma lista de Retargeting do Meta Ads.
5. **Auditor de Conversão CAPI (O MVP Atual):** Continua sendo o maestro que escuta as confirmações de compra não registradas no sistema e aciona o Meta Pixel invisivelmente.
6. **Auditor de Qualidade de Atendimento (QA Oculto):** Analisa conversas concluídas e gera uma pontuação técnica do vendedor: "Cumpriu o SLA? Usou gatilhos mentais? Foi empático?". 

---

## 2. Arquitetura de Dados Dinâmica (Prisma)

A orquestração do Mastra no Whatrack passa a ser via banco de dados, permitindo a criação e edição visual de Agentes.

### `AiAgent` (Modelo)
A entidade principal que define o Copiloto e sua matriz de comportamento.
- `id` (UUID)
- `organizationId` (UUID)
- `name` (String) - Ex: "Coach de Fechamento"
- `icon` (String) - Ícone representativo.
- `systemPrompt` (Text) - O cérebro do agente (Persona e restrições).
- `model` (String) - Permite escolher entre modelos rápidos (`gpt-4o-mini`) ou precisos (`llama-3.3-70b`).
- `isActive` (Boolean) - Botão On/Off.

### `AiTrigger` (Modelo)
Define **quando** e **como** a IA é acionada.
- `id` (UUID)
- `agentId` (UUID)
- `eventType` (Enum) - `TICKET_WON`, `TICKET_LOST`, `INACTIVITY_2H`, `NEW_MESSAGE_RECEIVED`, `MACRO_BUTTON_CLICKED`
- `throttleRules` (JSON) - Regras para evitar flood de contexto (ex: "Não rodar mais de 1 vez por hora por ticket").

### `AiSchemaField` (Modelo)
Define a estrutura (Zod) que o agente será forçado a cuspir em JSON.
- `id` (UUID)
- `agentId` (UUID)
- `fieldName` (String) - Nome da variável técnica (ex: `objectionReason`).
- `fieldType` (Enum) - `STRING`, `NUMBER`, `BOOLEAN`, `ARRAY`, `ENUM`
- `description` (String) - Como a IA deve interpretar este campo.
- `isRequired` (Boolean)

### `AiInsight` (Modelo Genérico de Resultado)
Substituirá o atual `AiConversionApproval`, projetado para armazenar qualquer insight gerado por qualquer Agente.
- `id` (UUID)
- `organizationId` (UUID)
- `ticketId` (UUID)
- `agentId` (UUID)
- `payload` (JSON) - O resultado da inteligência. Ex: `{ "objection": "Preço Alto", "suggestedAction": "Oferecer carnê" }`.
- `actionStatus` (Enum) - `SUGGESTION`, `APPLIED`, `DISMISSED`.

---

## 3. Dinâmica de Execução de Plataforma (Mastra.ai + Background Workers)

O Whatrack operará como um maestro assíncrono:

1. **Escuta de Eventos:** Em vez de um CRON engessado de 5 min, o backend ouvirá eventos de sistema (via webhooks, Redis Pub/Sub ou fila). "Mensagem Recebida", "Ticket Movido", "Ticket Fechado".
2. **Match de Triggers:** O Worker buscará no banco todos os agentes ativos configurados para reagir àquele evento exato, daquela organização.
3. **Construção do Agente e Zod Schema Dinâmico:** O Worker mapeia as intenções de payload configuradas pelo usuário (`AiSchemaField`) e compila o Agente via validação estruturada on-the-fly.
4. **Execução Controlada:** O agente mastiga o contexto (e cruza com tracking UTM se necessário) e ejeta o `AiInsight`.
5. **Feed do Front-end em Tempo Real:** Conectado ao Centrifugo, os Insights pulam instantaneamente na tela do vendedor (como uma dica de Coach) ou no painel do Diretor (como uma auditoria).

---

## 4. UI: A App Store de Inteligência da Empresa

A aba de IA do Whatrack passará a ser uma Central de Automação Visual (Estilo Zapier / Make, focado em WhatsApp e Receita):

### 4.1 Galeria e Gestão de Copilotos (`/dashboard/settings/ai`)
- Visão de cards listando a força de trabalho de IAs habilitada pela organização: "Agente QA (Ativo)", "Agente CAPI (Ativo)".
- **Template Library:** Permitirá que a clínica adicione copilotos testados e pré-aprovados pela plataforma Whatrack com um clique ("Add Revenue Rescuer Copilot").

### 4.2 O "Agent Builder" Studio
Um formulário visual no-code onde o dono da clínica define:
1. **Nome e Diretriz do Agente:** Editor avançado de sistema para dar o papel da IA.
2. **Setup de Vida (Triggers):** Em quais situações específicas da jornada do cliente humano ela se mete?
3. **Extração Forçada (Variáveis de Saída):** Interface de +Campo com o que o Agente precisa arrancar da conversa (Ex: "Idade (Number)", "Possui Cartão? (Boolean)").

### 4.3 O Insight Feed Dinâmico
O TicketPanel, lado direito do Inbox, passará de um "Card Estático do Mastra de Venda" para um verdadeiro **Feed de Inteligência (Timeline Copilot)**:
As anotações e descobertas sobem na roleta em bolhas de inteligência: *"Este lead reclamou de preço (QA Auditor)"*; *"Dica: Desconto progressivo (Coach)"*.
