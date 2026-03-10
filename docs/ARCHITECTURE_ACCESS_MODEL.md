# Architecture Access Model

## Objetivo

Definir, sem ambiguidade, os tres niveis do produto e onde cada regra de acesso se aplica:

- `Platform`
- `Workspace`
- `Project`

Este documento existe para evitar misturar:

- papel global do SaaS
- papel de membro da organizacao
- escopo de dados por projeto

---

## Hierarquia do produto

```text
Platform (WhaTrack como SaaS)
  -> Workspace / Organization (agencia cliente)
    -> Project (cliente da agencia)
```

### 1. Platform

E o WhaTrack como sistema.

Pertence ao produto, nao a uma agencia especifica.

Exemplos:

- catalogo global de billing
- design system interno
- ferramentas tecnicas
- telas internas de operacao do SaaS

### 2. Workspace

E a organizacao ativa da sessao.

No banco, o nome continua `Organization`.
Na experiencia do produto, pode ser tratado como `Workspace` quando fizer sentido de UX.

Exemplos:

- equipe
- integracoes
- pipeline
- auditoria
- assinatura da agencia
- CRM e dashboards da agencia

### 3. Project

E um cliente da agencia dentro do workspace.

Cada projeto e um workspace operacional interno do cliente da agencia.

Exemplos:

- instancias de WhatsApp do cliente
- contas Meta Ads do cliente
- leads
- tickets
- vendas
- itens e categorias daquele cliente

---

## Modelo de acesso

### A. Papel global do SaaS

Origem:

- `session.user.role`

Arquivos atuais:

- [roles.ts](/Users/thiago/www/whatrack/src/lib/auth/rbac/roles.ts)
- [guards.ts](/Users/thiago/www/whatrack/src/lib/auth/guards.ts)

Uso correto:

- somente para recursos da `Platform`

Exemplos:

- secao `Sistema`
- design system
- catalogo global de billing
- operacao tecnica interna

### B. Papel e permissoes do Workspace

Origem:

- `member.role`
- permissoes efetivas calculadas para a organizacao ativa

Arquivos atuais:

- [validate-organization-access.ts](/Users/thiago/www/whatrack/src/server/auth/validate-organization-access.ts)
- [organization-rbac.service.ts](/Users/thiago/www/whatrack/src/server/organization/organization-rbac.service.ts)
- [use-authorization.ts](/Users/thiago/www/whatrack/src/hooks/auth/use-authorization.ts)

Uso correto:

- tudo que pertence ao workspace da agencia

Exemplos:

- sidebar operacional
- settings do workspace
- equipe
- integracoes
- pipeline
- catalogo
- auditoria
- assinatura da agencia

### C. Escopo por Project

Origem:

- `projectId`

Uso correto:

- filtrar dados e operacoes do cliente da agencia

Importante:

- `projectId` nao substitui RBAC
- `projectId` define escopo de dados
- RBAC continua vindo do workspace

---

## Regra de ouro

### Use `session.user.role` quando:

- a tela ou API pertence a `Platform`

### Use `useAuthorization()` / `validatePermissionAccess()` quando:

- a tela ou API pertence ao `Workspace`

### Use `projectId` quando:

- a tela ou API trabalha dentro de um cliente especifico da agencia

---

## O que pertence a cada camada

### Platform

- `/dashboard/design-system`
- `/dashboard/settings/billing` (catalogo global interno)
- qualquer rota interna de operacao do SaaS

### Workspace

- `/dashboard`
- `/dashboard/analytics`
- `/dashboard/meta-ads`
- `/dashboard/whatsapp/inbox`
- `/dashboard/projects`
- `/dashboard/leads`
- `/dashboard/tickets`
- `/dashboard/sales`
- `/dashboard/ia`
- `/dashboard/settings/*` do cliente

### Project

Escopo interno usado dentro do workspace para:

- WhatsApp
- Meta Ads
- Leads
- Tickets
- Sales
- Items
- Categories
- dashboards filtrados

---

## Frontend: como esta hoje

Existe base boa, mas a separacao ainda nao esta clara o suficiente.

### O que ja existe

- hook cliente de autorizacao do workspace:
  - [use-authorization.ts](/Users/thiago/www/whatrack/src/hooks/auth/use-authorization.ts)
- helpers de papel global:
  - [roles.ts](/Users/thiago/www/whatrack/src/lib/auth/rbac/roles.ts)
- guards de workspace:
  - [validate-organization-access.ts](/Users/thiago/www/whatrack/src/server/auth/validate-organization-access.ts)

### O problema atual

Parte da UI ainda usa papel global onde deveria usar permissao do workspace.

Isso confunde:

- quem e admin do SaaS
- quem e owner/admin/user da organizacao

---

## Diretriz de implementacao

### Sidebar operacional

- sempre por permissao do workspace

### Settings do workspace

- sempre por permissao do workspace

### Secao Sistema

- sempre por papel global do SaaS

### Billing da agencia

- pertence ao workspace
- nao deve depender de papel global
- deve ser controlado por permissao de workspace

---

## Decisao de nomenclatura

- Banco e servicos podem continuar com `Organization`
- UX pode falar `Workspace` quando fizer sentido
- `Project` representa o cliente da agencia
- `Platform` representa o SaaS interno

Resumo:

```text
Platform = WhaTrack como sistema
Workspace = agencia cliente
Project = cliente da agencia
```
