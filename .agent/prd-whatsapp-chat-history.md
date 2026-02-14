# PRD: Central de Chat WhatsApp e Histórico de Mensagens (Modo Leitura)

## 1. Introdução
Este Documento de Requisitos do Produto (PRD) descreve a implementação de uma **Central de Chat WhatsApp** (Inbox) para as organizações dentro da plataforma Whatrack. O objetivo é fornecer uma interface unificada para que as empresas possam visualizar as conversas trocadas através de seus números de WhatsApp registrados. Este recurso é crítico para monitorar interações e manter um histórico completo da comunicação com os clientes.

## 2. Declaração do Problema
Atualmente, as organizações não têm visibilidade das conversas que acontecem nos seus números de WhatsApp cadastrados. Sem uma caixa de entrada centralizada:
- É impossível rastrear o histórico e o contexto das mensagens.
- As organizações não conseguem verificar se os leads estão sendo atendidos corretamente.
- Não há registro persistente das comunicações caso um dispositivo seja desconectado ou se as mensagens forem apagadas do aparelho.

## 3. Metas e Objetivos (Fase 1: Modo Leitura)
- **Inbox Centralizado (Visualização):** Uma página dedicada para ver todas as conversas recebidas e enviadas (capturadas via webhook).
- **Sincronização em Tempo Real:** Receber e armazenar mensagens via Webhooks para construir o histórico.
- **Histórico de Mensagens:** Manter um banco de dados de todas as mensagens trocadas *após* a conexão ser estabelecida.
- **Multi-Tenancy:** Garantir que cada organização veja apenas as conversas relevantes às suas instâncias específicas.
- **Transparência sobre Limitações:** Comunicar claramente que o histórico de mensagens *anterior* à conexão não pode ser importado via API.

*Nota: O envio de mensagens a partir da plataforma será implementado em uma fase futura. O foco atual é monitoramento e rastreamento.*

## 4. Arquitetura Técnica

### 4.1. Integração com WhatsApp Cloud API
Utilizaremos a Meta WhatsApp Cloud API para capturar mensagens.
- **Mensagens Recebidas (Inbound):** Devemos implementar um **Webhook Receiver** para escutar eventos de `messages`. Esta é a *única* maneira de receber mensagens em tempo real.
- **Mensagens Enviadas (Outbound):** Embora não enviemos pela plataforma agora, focaremos em capturar tudo que entra. Se houver integração com outras ferramentas, tentaremos capturar eventos de envio se disponíveis via webhook.
- **Status da Mensagem:** Escutaremos eventos de webhook `messages_status` (enviado, entregue, lido).

### 4.2. Esquema de Banco de Dados (Prisma)
Precisamos estender nosso modelo de dados para suportar o histórico de chat.

#### Novo Modelo: `Contact` (ou alias para Lead)
Representa um usuário que interage com uma Instância de WhatsApp específica.
- `id`: UUID
- `instanceId`: Relação com `WhatsAppInstance`
- `waId`: O ID do WhatsApp (número de telefone, ex: "5511999999999")
- `pushName`: O nome de exibição do WhatsApp
- `profilePicUrl`: URL (opcional, se conseguirmos buscar a info do perfil)
- `lastMessageAt`: DateTime (para ordenação)
- `createdAt`/`updatedAt`

#### Novo Modelo: `Message`
Representa uma mensagem individual em uma conversa.
- `id`: UUID
- `wamid`: string (O ID único da mensagem no WhatsApp)
- `contactId`: Relação com `Contact`
- `instanceId`: Relação com `WhatsAppInstance`
- `direction`: Enum (`INBOUND`, `OUTBOUND`)
- `type`: Enum (`text`, `image`, `document`, `audio`, `video`, `template`, `sticker`, etc.)
- `body`: Conteúdo de texto (ou legenda para mídia)
- `mediaUrl`: URL para arquivos de mídia (armazenado no S3/Supabase Storage)
- `status`: Enum (`sent`, `delivered`, `read`, `failed`)
- `timestamp`: DateTime (quando a mensagem foi enviada/recebida)
- `conversationId`: (Opcional) ID da conversa da Meta para rastreamento de cobrança.

### 4.3. Implementação do Webhook
- **Endpoint:** `/api/webhooks/whatsapp`
- **Verificação:** Implementar a lógica de verificação de requisição `GET` exigida pela Meta (Hub Challenge).
- **Processamento (POST):**
    1.  Validar assinatura (X-Hub-Signature-256).
    2.  Verificar o objeto `messages`.
    3.  Extrair `from` (ID do remetente).
    4.  Encontrar ou Criar `Contact` baseado em `from` + `instanceId`.
    5.  Salvar `Message` no banco de dados.
    6.  Atualizar `Contact.lastMessageAt`.
    7.  (Opcional) Acionar atualização da UI em tempo real via WebSocket/Pusher (ou polling com React Query para MVP).
    8.  Lidar com downloads de mídia (a URL de mídia no webhook é temporária; deve ser baixada e re-enviada para nosso storage).

### 4.4. Desconexão e Limites de Histórico
- **Desconexão:**
    - Usar `DELETE` na instância ou uma chamada de API específica para desregistrar, se necessário.
    - A Meta fornece um endpoint `POST /{{Phone-Number-ID}}/deregister` para remover um número da Cloud API.
    - **Nota:** Desconectar interrompe os eventos de webhook. Reconectar depois *não* recupera as mensagens perdidas.
- **Importação de Histórico:**
    - **Restrição:** A Cloud API *não permite* recuperar histórico de mensagens anterior ao estabelecimento da conexão API.
    - **Estratégia:** Rastreamos o histórico apenas a partir do momento em que o webhook está ativo. Devemos educar o usuário sobre essa limitação.

## 5. Requisitos de Interface de Usuário (UX)

### 5.1. Layout do Chat (Página Inbox - Modo Leitura)
- **Barra Lateral (Esquerda):**
    - **Seletor de Instância:** Dropdown para selecionar qual caixa de entrada do número visualizar.
    - **Busca:** Filtrar contatos por nome/número.
    - **Lista de Conversas:**
        - Itens da linha: Nome/Número do Contato, Prévia da Última Mensagem, Horário.
        - Ordenado por `lastMessageAt` decrescente.
- **Área Principal do Chat (Direita):**
    - **Cabeçalho:** Nome do Contato, Número.
    - **Fluxo de Mensagens (Timeline):**
        - Exibição cronológica das mensagens.
        - Diferenciação visual entre mensagens recebidas e enviadas.
        - Timestamps em cada balão.
    - **Área de Input (Desabilitada):**
        - *Nota: Nesta fase, não haverá input de texto ou botão de enviar.*
- **Estado Vazio:** "Selecione uma conversa para visualizar o histórico."

### 5.2. Notificações
- Indicador visual (toast ou badge) quando uma nova mensagem chega enquanto se está na plataforma.

## 6. Plano de Implementação / Workflow

#### Fase 1: Banco de Dados e Backend
1.  Atualizar esquema do Prisma com modelos `Contact` e `Message`.
2.  Rodar migrações.
3.  Criar o endpoint Webhook (`/api/webhooks/whatsapp`) para lidar com verificação e mensagens recebidas.
4.  Implementar funções de serviço para persistência de mensagens.
5.  Implementar manipulação básicas de mídia (baixar da Meta -> upload para nosso storage).

#### Fase 2: Infraestrutura Frontend
1.  Criar hooks `useChat` para buscar lista de contatos e histórico de mensagens.

#### Fase 3: Construção da UI
1.  Construir componente `ChatSidebar`.
2.  Construir componente `ChatWindow` (apenas leitura).
3.  Construir componente `MessageBubble`.
4.  Montar na página `/dashboard/whatsapp/inbox`.
