# WhatsApp Inbox & Chat History PRD (v3)

## Objetivo
Implementar um sistema de **Caixa de Entrada (Inbox)** centralizada focado no monitoramento e rastreamento de mensagens, unificando a gestão de contatos e leads em uma única entidade para evitar duplicação de dados e lógica.

---

## 1. Arquitetura de Dados (Unificação)

Para evitar complexidade e duplicação, eliminamos a entidade `Contact` e centralizamos tudo em `Lead`.

### A. Modelo: Lead (CRM & Chat)
O `Lead` passa a ser a entidade única que representa o cliente em todos os canais (Anúncios, Orgânico e WhatsApp).

| Campo | Descrição |
|-------|-----------|
| `name` | Nome "oficial" atribuído no CRM ou capturado em formulário. |
| `pushName` | Nome de perfil capturado via WhatsApp (Meta API). |
| `phone` | Identificador único para a Organização (formato internacional). |
| `waId` | Identificador técnico da Meta (geralmente o número sem símbolos). |
| `profilePicUrl` | Foto de perfil síncronizada com o WhatsApp. |
| `lastMessageAt` | Timestamp da última interação (para ordenação do Inbox). |

### B. Modelo: Message
Armazena o histórico completo, vinculado diretamente ao Lead.

| Campo | Descrição |
|-------|-----------|
| `wamid` | WhatsApp Message ID (Único, usado para evitar duplicidade). |
| `leadId` | Vínculo com o Lead proprietário da conversa. |
| `instanceId` | Vínculo com a `WhatsAppConfig` (qual número da empresa recebeu/enviou). |
| `direction` | `INBOUND` (Recebida) ou `OUTBOUND` (Enviada). |
| `status` | `sent`, `delivered`, `read`, `failed`. |
| `type` | `text`, `image`, `audio`, `video`, `document`, `sticker`. |
| `body` | Conteúdo de texto ou legenda da mídia. |
| `mediaUrl` | Meta Media ID ou URL interna da mídia. |

---

## 2. Fluxos e Processamento

### A. Recebimento de Mensagens (Webhook)
1.  **Identificação**: Captura `from` (telefone) e `phone_number_id` (instância).
2.  **Lead Upsert**: 
    *   Busca `Lead` por telefone na organização.
    *   Se não existir: Cria `Lead` usando o `pushName` e telefone.
    *   Se existir: Atualiza `lastMessageAt` e `pushName` (se mudou).
3.  **Persistência**: Salva a mensagem vinculada ao `lead.id`.

### B. Sincronização de Histórico
1.  **On-demand**: Endpoint `GET /message_history` da Meta é consultado.
2.  **Ingestão**: As mensagens históricas são inseridas de forma "silenciosa" (sem disparar notificações) vinculadas ao Lead correspondente.

---

## 3. Interface: Inbox (Frontend)

O Layout será baseado em um padrão de Chat moderno:

### Sidebar (Lista de Leads)
*   **Ordenação**: Mais recentes primeiro (`lastMessageAt`).
*   **Busca**: Filtro por nome (CRM ou PushName) e Telefone.
*   **Preview**: Mostra o `PushName` se o `Name` estiver vazio.

### Chat Window
*   **Histórico Linear**: Mensagens agrupadas por data.
*   **Status Visual**: Ícone de check para mensagens lidas.
*   **Diferenciação**: Mensagens do Lead (esquerda) vs Mensagens da Empresa (direita).

---

## 4. Benefícios da Abordagem
*   **Consistência**: O "João do Anúncio" é o mesmo "João que mandou Oi no WhatsApp".
*   **Prontidão para Tickets**: Como o `Lead` já é a base, a futura implementação de `Tickets` será apenas uma tabela intermediária vinculando `Lead` -> `Status/Stage`.
*   **Performance**: Menos joins no banco de dados para listar as conversas.
