# DIAGNOSTIC — PRD-004: Settings Redesign

## Problemas Identificados

### D1 — Catálogo e Pipeline são conteúdo operacional, não configuração de sistema

**Impacto:** Alto  
**Tipo:** Arquitetura de produto

O usuário cria um item do catálogo enquanto está registrando uma venda. O usuário ajusta uma etapa do pipeline quando está triando leads. Ambas as ações ocorrem no fluxo de trabalho diário, não em uma sessão de configuração do sistema.

Estar em settings cria fricção: o usuário precisa sair do contexto de trabalho, navegar para settings, fazer a configuração, e voltar. Isso é especialmente grave no Pipeline, onde ajustar uma etapa do kanban deveria levar 5 segundos.

**Evidências:**
- Pipeline: 4 campos por estágio, drag-and-drop simples → ideal para um sheet lateral
- Catálogo: usa exatamente o mesmo padrão CRUD do restante do app (CrudDataView, drawers, infinite scroll) → pertence ao app

### D2 — Sem padrão visual nas páginas de settings

**Impacto:** Alto  
**Tipo:** Design / Consistência

Cada página foi construída de forma independente:

| Página | Padrão atual | Problemas |
|--------|-------------|-----------|
| Profile | `SettingsSection` + formulários abertos | 5 botões "Salvar" independentes |
| Organization | `SettingsSection` + CNPJ lookup multi-estado | Fluxo preview/confirm desnecessariamente complexo visualmente |
| WhatsApp | Layout customizado (`flex flex-col`, DataToolbar) | Não usa PageShell, quebra o ritmo visual |
| Meta Ads | Raw div com min-height customizado | Não usa PageShell |
| Team | Card > Table | Card desnecessário em volta da tabela |
| AI Studio | Grid de cards | Inconsistente com demais pages |

**Resultado:** O usuário nunca sabe onde está o botão de salvar, nem quantas seções há em uma página.

### D3 — Webhooks isolado sem motivo

**Impacto:** Baixo  
**Tipo:** Navegação / UX

`/settings/webhooks/whatsapp` é uma página inteira para uma configuração técnica que tem exatamente 2 elementos (URL + botão de regenerar token). Ocupa um item valioso na sidebar.

Pertence como tab ou seção dentro de `/settings/whatsapp`.

### D4 — Sem separação visual de nível de acesso na sidebar

**Impacto:** Médio  
**Tipo:** UX / Segurança percebida

Itens de admin (Planos, Design System) aparecem no mesmo grupo ou sem separação clara de itens que qualquer membro pode acessar. Embora a proteção seja server-side (correta), a sidebar não comunica essa distinção.

A sidebar atual já tem um grupo "Admin" isolado com verificação `isAdminUser`/`isOwnerUser`. Mas "Assinatura" (owner only) ainda aparece dentro de "Workspace" misturado com "Organização" e "Equipe".

### D5 — Projetos em settings sem contexto

**Impacto:** Médio  
**Tipo:** Arquitetura de produto

"Projetos" foi movido para settings nessa sessão, mas a rota é `/elev8/elev8/projects` — fora do path `/settings/*`. Isso faz o sidebar mudar de modo settings para modo app ao navegar para Projetos (confusão de contexto).

Decisão a tomar: Projetos deve ter uma rota `/settings/projects` (mantém consistência do settings mode) ou deve ser um item de app.

## Riscos

### R1 — Quebrar rotas de webhook

O `activePatterns` da sidebar de settings inclui `/settings/webhooks/whatsapp`. Ao mover webhooks para dentro do WhatsApp, qualquer bookmark ou link direto para essa URL quebraria. **Mitigação:** Manter a rota antiga como redirect permanente.

### R2 — Catálogo usado em outros contextos

Verificar se `CatalogPage` ou seus subcomponentes são importados diretamente por outras partes do app além da página de settings. Se sim, o move é um refactor de arquivo, não apenas de rota.

### R3 — Pipeline sheet precisa de re-fetch sincronizado

Ao abrir o sheet de configuração do pipeline a partir da tela de kanban, mudanças nos estágios precisam re-invalidar o query `['ticket-stages']` que alimenta o kanban. Isso já existe na page de tickets (`queryClient.invalidateQueries`), mas precisa ser testado.

### R4 — WhatsApp tab state com URL cleanup

Se Webhooks vira tab de WhatsApp via `useState` (sem URL), redirecionar `/settings/webhooks/whatsapp` para `/settings/whatsapp` (sem tab) é simples. Mas se usarmos URL params para as tabs, o redirect precisa incluir o param.

### R5 — SettingsRow em formulários com validação complexa

Organization tem lookup de CNPJ com estados múltiplos (loading, preview, confirmed, error). O componente `SettingsRow` precisa suportar conteúdo arbitrário à direita — não apenas inputs simples. Isso é possível com `children` slot, mas precisa de atenção no design.
