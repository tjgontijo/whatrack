# Contexto: WhatsApp Disparo em Massa via API Oficial

**Ultima atualizacao:** 2026-03-19

---

## Definicao

A feature de disparo em massa amplia a integracao oficial do WhatsApp para permitir campanhas operacionais e de marketing em escala. Em vez de apenas enviar um template unitario para um numero especifico, o sistema passa a orquestrar uma campanha completa: montar audiencia, validar elegibilidade, aprovar, disparar agora ou agendar, acompanhar resultado e correlacionar respostas.

Na v1, o produto sera um Campaign Core MVP. Isso significa resolver o fluxo principal com seguranca e rastreabilidade, evitando automacoes complexas cedo demais.

---

## Quem Usa

- Usuarios com acesso ao projeto que precisam montar campanhas.
- Times operacionais que querem disparos utilitarios ou de relacionamento.
- Times de marketing que precisam usar templates aprovados e respeitar opt-out.
- Aprovadores da campanha, que na v1 sao os mesmos usuarios com acesso ao projeto.

---

## Fluxo Atual

Hoje o produto ja possui os blocos tecnicos abaixo:

- onboarding oficial da Meta para conectar WABA e numeros
- gerenciamento de instancias por organizacao e projeto
- CRUD de templates aprovados pela Meta
- envio unitario de template por endpoint dedicado
- webhook oficial para eventos de mensagens e status
- inbox com conversas, mensagens e correlacao basica por lead

Limitacoes do fluxo atual:

- nao existe entidade de campanha
- nao existe audiencia salva ou importada para disparo
- nao existe aprovacao ou agendamento
- nao existe execucao em lotes
- nao existe rastreio por destinatario da campanha
- nao existe atribuicao explicita de resposta para campanha

---

## Regras de Negocio Relevantes

- A v1 deve aceitar audiencia vinda do CRM e de importacao.
- Qualquer usuario com acesso ao projeto pode criar campanha.
- O envio pode ser imediato ou agendado.
- A campanha deve usar apenas templates aprovados pela Meta.
- A campanha deve permitir uso manual de multiplas instancias.
- Contatos inelegiveis devem ser excluidos automaticamente antes do disparo, com preview de motivos.
- O uso principal cobre campanhas de marketing e operacionais.
- O envio ou agendamento exige aprovacao, mas o proprio criador pode autoaprovar na v1.
- Opt-out bloqueia campanhas de marketing, nao necessariamente operacionais.
- Duplicidade deve ser removida automaticamente por telefone dentro da campanha.
- Contatos importados nao viram lead automaticamente no momento da importacao.
- Quando houver resposta, o sistema deve registrar a interacao no chat e marcar a origem da campanha.

### Recomendacao de desenho para multiplas instancias

Para suportar "multiplas instancias" sem cair em distribuicao automatica, a recomendacao deste PRD e usar blocos de envio dentro da campanha. Cada bloco de envio liga:

- uma instancia especifica
- uma fatia de audiencia
- um template aprovado
- uma configuracao de disparo

Assim, a campanha continua unica no ponto de vista do usuario, mas a execucao permanece manual e previsivel.

### Inferencia importante para contatos importados

Como contatos importados nao devem virar lead automaticamente na importacao, a v1 precisa tratar destinatarios importados como entidades de campanha ate o momento de uma resposta real. Se houver resposta inbound, o sistema pode criar ou vincular um lead nesse momento para preservar o fluxo de chat sem poluir o CRM antes da hora.

---

## Dados e Integracoes

### Modelos/tabelas ja existentes

- `Lead`
- `Conversation`
- `Message`
- `Ticket`
- `Project`
- `WhatsAppConfig`
- `WhatsAppConnection`
- `WhatsAppWebhookLog`
- `WhatsAppAuditLog`

### Novos modelos propostos

- `WhatsAppCampaign`
- `WhatsAppCampaignDispatchGroup`
- `WhatsAppCampaignRecipient`
- `WhatsAppCampaignApproval`
- `WhatsAppCampaignImport`
- opcionalmente um log de eventos de execucao por campanha ou por destinatario

### APIs externas

- Graph API para envio de templates
- Graph API para consulta de templates aprovados
- Webhook oficial da Meta para mensagens e status

### Caches/tags

- O caminho critico de execucao de campanha nao deve depender de cache.
- Leituras de dashboard podem usar cache explicito apenas onde fizer sentido, sem afetar o estado de execucao.

### Permissoes/autorizacao

- Criacao de campanha: usuarios com acesso ao projeto
- Aprovacao: usuarios com acesso ao projeto
- Disparo/agendamento: somente campanha aprovada
- Escopo multi-tenant: sempre limitado a organizacao e projeto

---

## Estado Desejado

Quando a feature estiver pronta, o usuario devera conseguir:

- criar uma campanha em rascunho
- montar blocos de envio por instancia
- selecionar audiencia do CRM ou importar uma lista
- visualizar elegiveis e inelegiveis antes do disparo
- aprovar a campanha
- disparar agora ou agendar
- acompanhar progresso e resultados por destinatario
- identificar respostas geradas pela campanha

Tudo isso deve acontecer sem quebrar o inbox atual, sem misturar automacao avancada nesta fase e sem obrigar a conversao imediata de contatos importados em leads.
