# Contexto: Contexto Canonico de Organizacao e Projeto na URL

**Ultima atualizacao:** 2026-03-20

---

## Definicao

O produto opera em um modelo multi-tenant onde a organizacao define o workspace principal e o projeto define o escopo operacional de modulos como WhatsApp, leads, tickets, vendas, itens e Meta Ads. A experiencia atual depende de um "projeto ativo" implicito no app, mas esse contexto nao esta expresso na URL.

A proposta deste PRD e mover o escopo para uma URL canonica no formato:

- `/app/[organizationSlug]/[projectSlug]/dashboard`
- `/app/[organizationSlug]/[projectSlug]/campaigns/whatsapp`
- `/app/[organizationSlug]/[projectSlug]/whatsapp/inbox`
- `/app/[organizationSlug]/[projectSlug]/leads`

O ponto central e que a URL passe a representar o contexto atual do usuario, e o servidor valide esse contexto em toda requisicao relevante. Como o sistema ainda esta em desenvolvimento, este PRD assume que a equipe pode redesenhar a estrutura de rotas e resetar o banco com `scripts/reset-db.sh` sem a obrigacao de preservar caminhos ou dados antigos.

---

## Quem Usa

- usuarios operacionais que trabalham dentro de um projeto especifico
- gestores que alternam entre varios projetos dentro da mesma organizacao
- times de suporte e produto que precisam reproduzir exatamente o contexto de um bug

---

## Fluxo Atual

Hoje o sistema funciona assim:

- o layout de dashboard resolve a organizacao atual e o `activeProjectId`
- a sidebar permite trocar o projeto por um seletor cliente
- a troca de projeto grava `x-project-id` via `PATCH /api/v1/projects/current`
- o servidor resolve o projeto por header, fallback de sessao e depois cookie
- algumas telas cliente usam `useProject()` para descobrir o projeto atual
- varias APIs usam `resolveProjectScope()` para transformar contexto implicito em `projectId`

Esse fluxo e funcional, mas possui custo arquitetural:

- a URL nao expressa o contexto do projeto
- um refresh, link compartilhado ou nova aba depende de estado lateral
- o cliente pode ficar temporariamente dessincronizado do servidor
- o debug de comportamentos por projeto fica mais dificil

Como o produto ainda nao exige retrocompatibilidade forte, faz mais sentido evitar uma fase hibrida longa entre modelo antigo e novo.

---

## Regras de Negocio Relevantes

- toda URL com projeto deve validar que o `organizationSlug` pertence ao usuario autenticado
- toda URL com projeto deve validar que o `projectSlug` pertence a organizacao da rota
- o slug da organizacao deve ser unico globalmente
- o slug do projeto deve ser unico por organizacao
- o cookie de projeto nao pode ser tratado como fonte de autorizacao
- o servidor continua sendo a autoridade para resolver acesso
- a entrada em `/app` pode usar o ultimo projeto valido apenas como redirecionamento de conveniencia
- modulos que nao dependem de projeto podem continuar fora da URL projetizada
- nao ha requisito de preservar a arvore antiga de `/dashboard` durante a migracao
- se a mudanca de schema ficar mais simples com reinicializacao, o processo oficial e usar `scripts/reset-db.sh`
- toda tabela mapeada no banco deve usar prefixo de dominio no nome fisico
- nomes genericos sem dominio como `projects`, `member` ou `organization` devem ser evitados na nova convencao

---

## Politica de Slug

### Regras gerais

- slugs devem ser armazenados em lowercase
- slugs devem usar apenas caracteres ASCII, numeros e hifen
- espacos e separadores devem ser convertidos para `-`
- hifens duplicados devem ser colapsados
- o slug nao deve comecar nem terminar com `-`
- a aplicacao deve normalizar antes de persistir

### Organizacao

- `Organization.slug` e unico globalmente
- o sistema pode sugerir um slug inicial a partir do nome
- o usuario deve poder escolher e editar o slug antes de salvar
- o sistema so deve permitir salvar quando o slug estiver valido e livre
- o backend deve revalidar no submit
- o sistema nao deve escolher silenciosamente um slug alternativo sem confirmacao do usuario

### Projeto

- `Project.slug` e unico dentro da organizacao
- o mesmo slug pode existir em organizacoes diferentes
- o slug deve ser sugerido ou preenchido na criacao e validado no update
- o sistema pode sugerir um slug inicial a partir do nome
- o usuario deve poder escolher e editar o slug antes de salvar
- o sistema so deve permitir salvar quando o slug estiver valido e livre dentro da organizacao
- o backend deve revalidar no submit
- o sistema nao deve escolher silenciosamente um slug alternativo sem confirmacao do usuario

### Colisao, Corrida e Edicao

- a aplicacao deve verificar disponibilidade antes de persistir
- o banco deve garantir unicidade com constraint
- em caso de corrida, o backend deve retornar erro de indisponibilidade e solicitar nova escolha
- alterar `name` nao deve alterar `slug` automaticamente
- alterar slug, se permitido no futuro, deve ser uma acao explicita
- URLs antigas nao precisam ser preservadas nesta fase

### UX Esperada

- o campo de slug deve ter validacao de formato em tempo real
- o sistema deve indicar claramente:
- `valido e disponivel`
- `invalido`
- `ja esta em uso`
- a experiencia deve ser parecida com criacao de username em produtos como Instagram ou GitHub

---

## Convencao Desejada de Nomes Fisicos

Regra principal:

- toda tabela deve comecar com um prefixo de dominio
- o restante do nome deve ser plural e descritivo
- a convencao deve ser refletida em `@@map(...)`

Direcao recomendada para os dominios atuais:

- `auth_*` para autenticacao e sessao
- `org_*` para organizacao, membros, convites e perfis
- `crm_*` para projetos, leads, tickets, vendas, itens e entidades operacionais centrais
- `whatsapp_*` para integracao e operacao de WhatsApp
- `meta_*` para Meta Ads
- `billing_*` para faturamento
- `ai_*` para IA

Exemplos de revisao esperada:

- `organization` -> `org_organizations`
- `projects` -> `crm_projects`
- `member` -> `org_members`
- `invitation` -> `org_invitations`
- `leads` -> `crm_leads`
- `tickets` -> `crm_tickets`
- `sales` -> `crm_sales`
- `items` -> `crm_items`

---

## Dados e Integracoes

- `Organization` ja possui `slug`
- `Project` ainda precisa de `slug` no modelo principal
- a politica de slug precisa ser tratada de forma uniforme para organizacao e projeto
- `src/server/project/get-current-project-id.ts` resolve projeto por header, sessao e cookie
- `src/server/project/project-scope.ts` centraliza a validacao de escopo por `projectId`
- `src/app/api/v1/projects/current/route.ts` hoje controla o cookie de projeto
- `src/components/dashboard/sidebar/sidebar-client.tsx` controla a troca de projeto na UI
- `src/hooks/project/use-project.ts` expoe o projeto atual para consumidores cliente
- `scripts/reset-db.sh` permite resetar banco, migrations locais e seed durante o redesenho
- o schema atual mistura tabelas com e sem prefixo de dominio, o que deve ser corrigido nesta iniciativa

---

## Estado Desejado

Quando a feature estiver pronta:

- o projeto atual sera determinado pela URL
- a sidebar mudara o projeto navegando para uma nova rota, nao apenas gravando estado implcito
- o layout do app resolvera `organizationSlug` e `projectSlug` para um contexto server-side validado
- os modulos scoped por projeto receberao esse contexto explicitamente
- o cookie de projeto sera no maximo um mecanismo opcional de "ultimo projeto usado"
- links compartilhados abrirao exatamente o mesmo contexto sem depender de estado previo no browser
- a estrutura antiga baseada em contexto implicito podera ser removida em vez de mantida em paralelo
- a camada fisica do banco seguira uma convencao unica de nomes com prefixo de dominio
