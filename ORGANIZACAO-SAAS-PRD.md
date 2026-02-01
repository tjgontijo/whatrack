# WhaTrack - PRD de Organizacao do SaaS

## 1) Visao Geral
Este PRD define como organizar o codigo do SaaS para crescimento sustentavel, com foco em:
- estrutura previsivel ("onde esta cada coisa")
- arquivos com nomes autoexplicativos
- separacao clara de servicos por tema
- alinhamento com as convencoes do Next.js (App Router)

Hoje existe um diretorio `src/features` com varias responsabilidades misturadas (ui, types, api client, etc). A meta e mover para uma estrutura mais "next-native", **mantendo componentes no local geral do SaaS (`src/components`)** e **sem quebrar a divisao atual bem definida entre `lib`, `services`, `server` e `helpers`**.

## 2) Objetivos
- Remover a ambiguidade de localizacao (arquivos em locais "nao originais" do Next).
- Garantir que qualquer arquivo tenha um local obvio, baseado no seu papel.
- Separar servicos por tema (ex: whatsapp, meta-ads, billing), com arquivos por funcao.
- Facilitar manutencao por um unico desenvolvedor.

## 3) Nao-objetivos
- Reescrever features ou mudar comportamento do produto.
- Mudar o framework (continuamos no Next.js App Router).
- Refatoracao profunda de UI fora do necessario para reorganizacao.

## 4) Principios de Organizacao
- **Rotas em `src/app`**: todo acesso do usuario e APIs vivem em `app/`.
- **Componentes ficam em `src/components`**: inclusive os especificos de um dominio (ex: `src/components/whatsapp/...`).
- **UI por dominio**: organizacao por tema dentro de `src/components`, `src/hooks`, `src/types`, etc.
- **Manter a divisao `lib` / `services` / `server` / `helpers`**:
  - `lib`: infraestrutura e utilitarios transversais (auth, prisma, config, utils).
  - `services`: integracoes externas (ex: Meta/WhatsApp, gateways, APIs).
  - `server`: regras e operacoes de dominio internas (ex: organizacao, CRM, tickets).
  - `helpers`: funcoes pequenas e reutilizaveis, sem estado.
- **Servicos por tema**: `src/services/<tema>/` com arquivos de responsabilidade unica.
- **Tipos por tema**: se usados apenas em um dominio, ficam no mesmo dominio.
- **Import boundaries simples**: UI -> api client -> route handler -> server -> service.

## 5) Estrutura Proposta

```
src/
  app/
    (auth)/...
    (dashboard)/
      settings/
        whatsapp/
          page.tsx
          [phoneId]/
            page.tsx
            settings/page.tsx
            templates/page.tsx
        webhook-meta/
          page.tsx
    api/
      v1/
        whatsapp/
          account/route.ts
          activate/route.ts
          business-profile/route.ts
          config/route.ts
          phone-numbers/route.ts
          send-template/route.ts
          templates/route.ts
          webhook/route.ts
  components/
    ui/
    dashboard/
    whatsapp/
    ...
  hooks/
    whatsapp/
  lib/
    auth/
    prisma.ts
    utils.ts
    whatsapp-client-api.ts
  helpers/
    ...
  server/
    auth/
    organization/
    whatsapp/
    ...
  services/
    whatsapp/
      client.ts
      account.ts
      activate.ts
      business-profile.ts
      phone-numbers.ts
      templates.ts
      messages.ts
      webhooks.ts
      index.ts
  types/
    shared/...
```

Notas:
- `src/features` deixa de existir. Tudo que era especifico de WhatsApp passa para `src/app/(dashboard)/settings/whatsapp`.
- Componentes ficam em `src/components/whatsapp`, hooks em `src/hooks/whatsapp`, tipos em `src/types/whatsapp` (ou `src/lib/types` se preferir).
- O client que chama as rotas internas fica em `src/lib/whatsapp-client-api.ts`.

## 6) Separacao de Servicos (Requisito Principal)
Cada tema tera um diretorio com arquivos claros:

Exemplo `src/services/whatsapp/`:
- `client.ts` -> configuracao base do Graph API (base url, versao, headers, errors)
- `templates.ts` -> listar/criar/remover templates
- `messages.ts` -> enviar mensagens e obter status
- `phone-numbers.ts` -> listar e consultar numeros
- `business-profile.ts` -> ler/atualizar perfil
- `account.ts` -> informacoes do WABA
- `webhooks.ts` -> utilitarios de assinatura/log
- `index.ts` -> reexporta os modulos

Racional: o nome do arquivo deve dizer o que ele faz, sem abrir o codigo.

Complemento:
- **server** concentra regras e fluxos internos (ex: validar organizacao, permissoes, regras de negocio).
- **services** encapsulam comunicacao externa (ex: chamadas ao Graph API).

## 7) Padroes de UI e Client API
- Componentes exclusivos do WhatsApp ficam em `src/components/whatsapp`.
- Hooks exclusivos do WhatsApp ficam em `src/hooks/whatsapp`.
- Tipos exclusivos do WhatsApp ficam em `src/types/whatsapp`.
- O client que chama as rotas internas fica em `src/lib/whatsapp-client-api.ts`.

## 8) Migracao (Fases)

**Fase 1 - Estrutura base**
- Criar `src/services/whatsapp/` e mover o service central para arquivos por tema.
- Criar pastas `_components`, `_hooks`, `_types`, `_client` nas rotas WhatsApp.

**Fase 2 - Mover UI**
- Mover tudo de `src/features/whatsapp` para as pastas locais em `app/`.
- Ajustar imports no restante do app.
 - Garantir que regras de negocio fiquem em `src/server` (quando aplicavel).

**Fase 3 - Ajustar API client**
- Substituir `src/features/whatsapp/api/whatsapp.ts` por `src/lib/whatsapp-client-api.ts`.

**Fase 4 - Limpeza**
- Remover `src/features`.
- Garantir que nao existem imports quebrados.

## 8.1) Impacto Direto (Arquivos/Imports que vao quebrar)
Ao remover `src/features`, os seguintes arquivos precisarao de ajuste de import:

**Rotas em `src/app`**
- `src/app/dashboard/settings/whatsapp/page.tsx` -> importa `@/features/whatsapp`
- `src/app/dashboard/settings/webhook-meta/page.tsx` -> importa `@/features/whatsapp/components/views/webhooks-view`
- `src/app/dashboard/settings/whatsapp/[phoneId]/page.tsx` -> importa `@/features/whatsapp/components/instance-detail`
- `src/app/dashboard/settings/whatsapp/[phoneId]/templates/page.tsx` -> importa `@/features/whatsapp/api/whatsapp` e `@/features/whatsapp/components/views/templates-view`
- `src/app/dashboard/settings/whatsapp/[phoneId]/settings/page.tsx` -> importa `@/features/whatsapp/api/whatsapp` e `@/features/whatsapp/components/views/profile-view`

**Arquivos internos ao dominio WhatsApp (hoje em `src/features/whatsapp`)**
- `src/features/whatsapp/page.tsx` -> `./api/whatsapp`
- `src/features/whatsapp/components/instance-detail.tsx` -> `../api/whatsapp`
- `src/features/whatsapp/components/views/overview-view.tsx` -> `../../api/whatsapp`
- `src/features/whatsapp/components/views/templates-view.tsx` -> `../../api/whatsapp` e `@/features/whatsapp/components/template-editor/template-editor-form`
- `src/features/whatsapp/components/views/send-test-view.tsx` -> `../../api/whatsapp`
- `src/features/whatsapp/components/views/webhooks-view.tsx` -> `../../api/whatsapp`
- `src/features/whatsapp/components/views/profile-view.tsx` -> `../../api/whatsapp`
- `src/features/whatsapp/components/dialogs/*` -> `../../api/whatsapp`
- `src/features/whatsapp/components/template-editor/*` -> `../../api/whatsapp`

Regra geral de ajuste: qualquer import que comece com `@/features/whatsapp` deve ser movido para o novo destino definido neste PRD (ex: `@/components/whatsapp`, `@/lib/api/whatsapp`, etc).

## 9) Requisitos de Qualidade
- Nao deve existir arquivo "genérico" com muitas responsabilidades.
- Tudo que e UI deve estar em `src/components` (organizado por tema).
- Servicos devem estar separados por tema.
- A divisao `lib` / `services` / `server` / `helpers` deve ser respeitada.
- Imports devem ser curtos e previsiveis.

## 10) Criterios de Aceite
- Nao existe mais `src/features`.
- Cada servico do WhatsApp tem um arquivo dedicado em `src/services/whatsapp/`.
- Todas as rotas e paginas continuam funcionando sem mudancas de comportamento.
- Um novo desenvolvedor consegue localizar qualquer feature sem contexto previo.
- A divisao `lib` / `services` / `server` / `helpers` segue consistente em todo o projeto.

## 11) Riscos e Mitigacao
- **Risco:** muitos arquivos movidos causando imports quebrados.
  - **Mitigacao:** migracao em fases e verificacao incremental.

- **Risco:** confusao entre UI compartilhada e UI local.
  - **Mitigacao:** regra simples: se nao e reutilizado por outras rotas, fica na rota.

## 12) Perguntas em Aberto
- Preferimos manter `src/types` para tipos globais, ou tudo deve ser colocalizado?
- Vamos manter `src/components` apenas para componentes 100% compartilhados?
