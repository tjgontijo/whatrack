# WhaTrack - PRD de Organização do SaaS

## 1) Visão Geral
Este PRD define como organizar o código do SaaS para crescimento sustentável e **conformidade com a Meta Cloud API (App Review)**, com foco em:
- Estrutura previsível ("onde está cada coisa")
- Arquivos com nomes autoexplicativos
- Separação clara de serviços por tema e camada de responsabilidade
- Alinhamento com as convenções do Next.js (App Router)
- Preparação para auditoria (Audit-Ready) para aprovação rápida na Meta

Hoje existe um diretório `src/features` com responsabilidades misturadas. A meta é mover para uma estrutura robusta, mantendo componentes organizados por domínio e garantindo que a lógica de negócio interna não se misture com a integração externa.

## 2) Objetivos
- Remover a ambiguidade de localização (arquivos em locais "não originais" do Next).
- Garantir que qualquer arquivo tenha um local óbvio, baseado no seu papel.
- Separar serviços por tema (ex: whatsapp, meta-ads, billing), com arquivos por função.
- **Isolamento de Domínio**: O código da API da Meta não deve vazar para a lógica de faturamento ou CRM.
- **Compliance Linkage**: Facilitar a geração de logs e evidências para o App Review da Meta.

## 3) Não-objetivos
- Reescrever features ou mudar comportamento do produto.
- Mudar o framework (continuamos no Next.js App Router).
- Refatoração profunda de UI fora do necessário para reorganização.

## 4) Princípios de Organização

### 4.1) Localização de Componentes:
Todos os componentes devem residir em `src/components`, organizados por categoria ou domínio:
1.  **`src/components/ui`**: Componentes atômicos e agnósticos (botões, inputs, cards, shadcn).
2.  **`src/components/dashboard`**: Componentes de layout e casca do sistema.
3.  **`src/components/whatsapp`**: Todos os componentes relacionados ao domínio WhatsApp, inclusive os específicos de uma página.

### 4.2) Camadas de Lógica:
- **`lib`**: Infraestrutura e utilitários transversais (auth, prisma, config, utils globais).
- **`services`**: Integrações EXTERNAS. É o puro "envelope" da API da Meta. Não deve conhecer o banco de dados.
- **`server`**: Regras de DOMÍNIO e operações internas (Server Actions). Valida permissões, salva no Prisma e chama o `service`.
- **`helpers`**: Funções pequenas, puras e reutilizáveis, sem estado.

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
            send-test/page.tsx
    api/
      v1/
        whatsapp/           # Route Handlers (apenas delegam para src/server)
          ... (routes)
  components/
    ui/                     # Design System (Tailwind + Shadcn)
    dashboard/              # Layout e componentes gerais do dashboard
    whatsapp/               # Todos os componentes do domínio WhatsApp
  hooks/
    whatsapp/               # useWhatsAppTemplates, useSendMessage, etc.
  lib/
    auth/
    prisma.ts
    utils.ts
    whatsapp/
      whatsapp-client-api.ts # Client que o front usa para chamar /api/v1
  server/
    whatsapp/               # Regras de Negócio e Server Actions
      template-actions.ts
      message-actions.ts
      account-actions.ts
    organization/           # Gestão de orgs e permissões
  services/
    whatsapp/               # Comunicação DIRETA com a Meta Graph API
      client.ts             # Axios/Fetch config + Error Handling Meta
      templates.ts
      messages.ts
      phone-numbers.ts
      index.ts
  types/
    whatsapp.ts             # Tipos que vêm da API da Meta
    domain.ts               # Nossos modelos internos
```

## 6) Compliance & Meta Review Readiness
Para facilitar a aprovação do app, a arquitetura deve suportar:
- **Audit Logs**: Toda mensagem enviada via `services/whatsapp/messages.ts` deve poder ser registrada no banco pela camada `server/`. Isso prova o uso correto da permissão `whatsapp_business_messaging`.
- **Sandbox Switch**: O `services/whatsapp/client.ts` deve facilitar a alternância entre IDs de teste e produção via env vars.
- **Vídeo de Demonstração**: A organização centralizada em `src/components/whatsapp` garante consistência visual para as gravações de Review.

## 7) Migração (Fases)

| Fase | Descrição | Risco |
| :--- | :--- | :--- |
| **Fase 1 - Core** | Criar `src/services/whatsapp/` e mover o service central (external). | Baixo |
| **Fase 2 - Brain** | Criar `src/server/whatsapp` para as regras de negócio e acesso ao banco. | Médio |
| **Fase 3 - UI Move** | Mover tudo de `src/features/whatsapp` para `src/components/whatsapp`. | Médio |
| **Fase 4 - Limpeza** | Criar `src/lib/whatsapp/whatsapp-client-api.ts` e remover `src/features`. | Baixo |

## 8) Requisitos de Qualidade e Aceite
- [ ] Nenhum arquivo genérico com múltiplas responsabilidades.
- [ ] **Isolamento**: `services/` nunca importa `prisma`.
- [ ] **Fluxo de Dados**: UI -> Hook -> Client API (lib) -> Route Handler (app/api) -> Server Action (server) -> Service.
- [ ] Todas as rotas funcionam sem mudanças de comportamento.
- [ ] Erros da API da Meta são tratados centralizadamente no `services/whatsapp/client.ts`.

## 9) Respostas às Perguntas de Arquitetura
- **Types**: Manter `src/types/whatsapp.ts` para definições da API externa e colocalizar tipos de props dentro dos próprios componentes em `src/components/whatsapp`.
- **Componentes**: Todos em `src/components/whatsapp`, eliminando o uso de diretórios privados (`_components`) nas rotas para manter a estrutura do Next.js limpa.
