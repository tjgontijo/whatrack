# Contexto: WhatsApp Campaign Audience Builder

**Ultima atualizacao:** 2026-03-22

---

## Definicao

Esta feature redesenha a area de campanhas WhatsApp para um modelo operacional centrado em audiencia reutilizavel. Em vez de tratar a campanha como um formulario rapido que nasce de um CSV descartavel, o produto passa a ter um dominio proprio para administrar listas de contatos, tags de leads e segmentos salvos do CRM.

Campanha deixa de ser "um disparo ad hoc" e passa a ser a combinacao de:

- uma audiencia persistida ou um segmento salvo
- um template aprovado pela Meta
- um mapa de resolucao de variaveis
- um modo de envio `manual` ou `agendado`
- um snapshot congelado de destinatarios no momento do envio

O resultado esperado e uma experiencia mais proxima de ferramentas operacionais maduras: o usuario administra publico, reaproveita configuracoes, revisa cobertura das variaveis e so depois confirma o disparo.

---

## Quem Usa

- Times operacionais que enviam comunicacoes recorrentes por WhatsApp.
- Times comerciais que querem acionar leads por etapa do pipeline.
- Times de suporte/CS que usam listas importadas para comunicacoes pontuais.
- Gestores ou admins que precisam organizar audiencia, tags e recorrencia operacional.

---

## Fluxo Atual

Hoje o modulo de campanhas funciona assim:

- `/whatsapp/campaigns` carrega `Visao Geral` e `Campanhas`.
- O botao `Nova campanha` abre um drawer de 3 passos:
  - configuracao
  - destinatarios
  - disparo
- O passo de destinatarios so trabalha com CSV.
- O CSV precisa seguir exatamente o modelo derivado do template.
- O payload de criacao ja embute a audiencia importada dentro de `POST /api/v1/whatsapp/campaigns`.
- A UI atual seleciona apenas uma instancia de envio.
- A pagina de detalhe permite `Enviar agora` e `Cancelar`.

Limitacoes relevantes do fluxo atual:

- nao existe administracao persistida de listas
- nao existe modelagem real de tags de leads
- nao existe segmento salvo do CRM
- a audiencia nao pode ser preparada antes da campanha
- a resolucao de variaveis e rigida e centrada em CSV
- o backend ainda carrega estados/endpoints de aprovacao que o produto nao quer manter
- a regra "fase do pipeline ha X dias" nao e suportada corretamente

O estado tecnico atual tambem tem drift de dominio:

- o schema de campanhas ja menciona `tagIds`, mas tags nao existem no CRM
- ha endpoints de `submit` e `approve`, mas a UI nao usa esse fluxo
- a documentacao anterior assumia aprovacao obrigatoria, enquanto a operacao desejada agora e somente manual ou agendada

---

## Regras de Negocio Relevantes

- Apenas templates `APPROVED` da Meta podem ser usados em campanha.
- A campanha continua com os tipos `MARKETING` e `OPERATIONAL`.
- A campanha pode ser `manual` ou `agendada`.
- O fluxo de aprovacao sera removido por completo.
- A audiencia usada na campanha deve ser persistida e administravel antes do disparo.
- Importacoes CSV devem virar `listas`, nao apenas payload descartavel de campanha.
- Tags pertencem ao CRM e se aplicam apenas a leads.
- Segmentos salvos consultam leads e tickets do CRM; nao se aplicam a contatos importados sem lead.
- Contatos importados nao devem virar lead automaticamente.
- Toda variavel obrigatoria do template precisa ser resolvida por destinatario antes do envio.
- Cada variavel pode vir de:
- campo padrao do CRM
- coluna da lista importada
- valor fixo definido na propria campanha
- Quando dados obrigatorios faltarem, a v1 deve sempre exibir preview de exclusao e remover esses destinatarios do snapshot final.
- A campanha nao tera um campo configuravel de `exclude vs block` nesta versao.
- O envio so pode prosseguir se houver pelo menos um destinatario valido depois da resolucao das variaveis.
- A campanha deve congelar o snapshot de destinatarios e valores das variaveis no momento de `enviar` ou `agendar`.
- Duplicidade deve ser removida por telefone normalizado dentro da campanha.
- O filtro "fase X ha Y dias" deve usar a fase atual do ticket aberto e a data de entrada nessa fase.
- O filtro de `atividade` significa `ultima atividade do lead`, usando `Lead.lastMessageAt` com janela relativa em dias.

### Semantica recomendada para segmentos CRM

Para manter a regra simples e previsivel na v1:

- segmento avalia leads no escopo da organizacao e, quando informado, do projeto
- filtros de pipeline olham para tickets `open`
- um lead entra no segmento se existir ao menos um ticket aberto que satisfaca os filtros
- filtro de atividade olha para `lead.lastMessageAt`
- no resultado final da campanha, a deduplicacao continua acontecendo por telefone

### Semantica recomendada para variaveis

As variaveis do template nao pertencem a lista, nem ao CRM, nem a campanha isoladamente. Elas sao resolvidas no contexto da campanha:

- `lista` fornece colunas arbitrarias para contatos importados
- `CRM` fornece um conjunto limitado de campos padrao
- `valor fixo` cobre dados identicos para todos os destinatarios da campanha

Exemplo:

- `nome_do_cliente` -> campo do CRM `lead.name`
- `numero_do_pedido` -> coluna da lista `pedido`
- `link_google_drive` -> valor fixo definido na campanha

---

## Dados e Integracoes

### Modelos/tabelas ja existentes

- `Lead`
- `Ticket`
- `TicketStage`
- `WhatsAppCampaign`
- `WhatsAppCampaignDispatchGroup`
- `WhatsAppCampaignRecipient`
- `WhatsAppCampaignImport`
- `Message`
- `WhatsAppConfig`

### Novos modelos propostos

- `LeadTag`
- `LeadTagAssignment`
- `WhatsAppContactList`
- `WhatsAppContactListMember`
- `WhatsAppAudienceSegment`
- `WhatsAppCampaignEvent`

### Mudancas propostas em modelos existentes

- adicionar `stageEnteredAt` em `Ticket`
- remover do dominio de campanhas:
- `PENDING_APPROVAL`
- `APPROVED`
- `WhatsAppCampaignApproval`
- `approvedById`
- `approvedAt`
- incluir na campanha a referencia para a origem da audiencia utilizada
- manter `WhatsAppCampaignRecipient` como snapshot final do envio

### APIs internas

- CRUD de listas de contatos
- importacao de membros de lista por CSV
- CRUD de tags de leads
- atribuicao/remocao de tags em leads
- CRUD e preview de segmentos do CRM
- criacao/edicao de campanhas com origem de audiencia persistida
- preview de resolucao de variaveis e de exclusoes antes do envio

### APIs externas

- Graph API da Meta para envio de templates
- Graph API da Meta para templates aprovados
- Webhook oficial da Meta para status e respostas

### Caches/tags

- O caminho critico de resolucao de audiencia e disparo nao deve depender de cache.
- Leituras administrativas de listas e segmentos podem usar invalidacao por query key, sem cache implicito.

### Permissoes/autorizacao

- Criar/editar campanha: usuarios com acesso ao projeto e ao modulo atual de WhatsApp.
- Criar/editar listas e segmentos: usuarios com acesso operacional ao projeto.
- Gerenciar tags: usuarios com permissao de operar leads/tickets ou equivalente.
- Enviar/agendar campanha: mesmo escopo de acesso atual do modulo de campanhas.

---

## Estado Desejado

Quando a feature estiver pronta, o usuario devera conseguir:

- abrir `/whatsapp/campaigns`
- navegar entre `Visao Geral`, `Campanhas` e `Audiencias`
- criar e manter listas de contatos importadas
- criar tags de leads e organizar o CRM para disparo
- salvar segmentos do CRM, incluindo filtros de pipeline e tempo na fase
- abrir um builder de campanha em pagina cheia
- escolher uma audiencia salva
- escolher um template aprovado
- deixar o sistema auto-mapear as variaveis conhecidas
- completar o que faltar com coluna da lista ou valor fixo
- visualizar quantos contatos serao enviados, excluidos ou bloqueados
- enviar imediatamente ou agendar
- acompanhar o resultado da campanha sem qualquer fluxo de aprovacao

Tudo isso deve acontecer sem quebrar a execucao atual por cron, sem converter contato importado em lead automaticamente e sem exigir um modulo generico de custom fields antes da entrega da primeira versao operacional.
