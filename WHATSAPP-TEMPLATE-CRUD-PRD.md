# WhaTrack - PRD: WhatsApp Template CRUD

## 1) Visão Geral

Este PRD define a implementação completa do CRUD (Create, Read, Update, Delete) de **Message Templates** para a WhatsApp Cloud API dentro do SaaS WhaTrack. O objetivo é permitir que usuários gerenciem seus templates diretamente pela plataforma, sem precisar acessar o Gerenciador oficial da Meta.

Esta funcionalidade é **crítica para o App Review da Meta**, pois demonstra o exercício da permissão `whatsapp_business_management` — um dos dois pilares da aprovação do aplicativo.

## 2) Objetivos

- Implementar CRUD completo de Message Templates via Meta Graph API.
- Garantir conformidade total com a API da Meta (case sensitivity, campos obrigatórios, limites de edição).
- Oferecer preview em tempo real do template no padrão visual do WhatsApp.
- Limpar código duplicado/órfão do codebase atual.
- Preparar a funcionalidade para gravação do vídeo de App Review.

## 3) Não-Objetivos

- Templates com componentes avançados (imagens, vídeos, botões interativos) na V1.
- Envio de templates em massa (bulk messaging).
- Agendamento de envio de templates.
- Relatórios de performance de templates.

## 4) Estado Atual do Código

### 4.1) O que já existe e funciona

| Funcionalidade | Arquivo(s) | Status |
|:---|:---|:---|
| **Listar templates (GET)** | `route.ts`, `whatsapp.ts`, `meta-cloud.service.ts`, `templates-view.tsx` | ✅ Completo |
| **Criar templates (POST)** | `route.ts`, `whatsapp.ts`, `template-editor-form.tsx` | ✅ Completo |
| **Excluir templates (DELETE)** | `route.ts`, `whatsapp.ts`, `delete-template-dialog.tsx` | ✅ Completo |
| **Preview ao vivo** | `template-preview.tsx` | ✅ Completo |
| **Detecção de variáveis** | `template-editor-form.tsx` (useEffect regex) | ✅ Completo |
| **Valores de amostra (samples)** | `template-editor-form.tsx` | ✅ Completo |

### 4.2) O que está faltando ou quebrado

| Problema | Descrição | Impacto |
|:---|:---|:---|
| **Sem Update real** | O form de edição chama `whatsappApi.createTemplate()` em vez de um `updateTemplate()`. A Meta exige `POST /{TEMPLATE_ID}` para editar. | 🔴 Crítico |
| **Sem rota PUT no backend** | `route.ts` não tem handler `PUT`/`PATCH`. | 🔴 Crítico |
| **Sem `editTemplate` no service** | `MetaCloudService` não tem método de update para templates. | 🔴 Crítico |
| **Código duplicado** | `CreateTemplateDialog.tsx` e `TemplateEditorPanel.tsx` são versões antigas do editor que não são mais usadas pela `TemplatesView`. | 🟡 Médio |
| **Categorias incompletas** | O schema antigo só suportava `MARKETING` e `UTILITY`. O novo inclui `AUTHENTICATION`, mas precisa alinhar backend. | 🟡 Médio |

## 5) Implementações Pendentes

### 5.1) Implementação 1: Template Update (Edição Real)

#### 5.1.1) Contexto da API da Meta

Para editar um template existente, a Meta exige:

```
POST https://graph.facebook.com/{API_VERSION}/{TEMPLATE_ID}
```

**Regras de edição da Meta:**
- Apenas templates com status `APPROVED`, `REJECTED` ou `PAUSED` podem ser editados.
- Templates `APPROVED` podem ser editados **até 10 vezes em 30 dias** ou **1 vez a cada 24 horas**.
- Templates `REJECTED`/`PAUSED` podem ser editados sem limite.
- **Não é possível alterar**: nome, categoria ou idioma de um template aprovado.
- Qualquer edição dispara um novo processo de revisão pela Meta.

#### 5.1.2) Tarefas

**Backend - Service Layer (`meta-cloud.service.ts`):**
- [ ] Adicionar método `editTemplate(templateId: string, data: any)` ao `MetaCloudService`.
- [ ] O método deve fazer `POST /{API_VERSION}/{TEMPLATE_ID}` com os componentes atualizados.
- [ ] Tratar erros específicos da Meta (ex: limite de edições atingido, template não editável).

**Backend - API Route (`route.ts`):**
- [ ] Adicionar handler `PUT` na rota `/api/v1/whatsapp/templates`.
- [ ] Receber `templateId` e `components` no body.
- [ ] Validar sessão e organização (mesmo padrão do POST/DELETE).
- [ ] Chamar `MetaCloudService.editTemplate()`.
- [ ] Retornar resposta com tratamento de erro granular.

**Frontend - API Client (`whatsapp.ts`):**
- [ ] Adicionar método `updateTemplate(templateId: string, data: any)`.
- [ ] Fazer `PUT /api/v1/whatsapp/templates` com body `{ templateId, ...data }`.

**Frontend - Formulário (`template-editor-form.tsx`):**
- [ ] Detectar modo `edit` vs `create` via prop `mode` ou presença de `template?.id`.
- [ ] No modo `edit`:
  - Desabilitar campos de nome, categoria e idioma (não editáveis pela Meta).
  - Preencher formulário com dados existentes do template.
  - Chamar `whatsappApi.updateTemplate()` em vez de `createTemplate()`.
- [ ] Mostrar aviso visual sobre limites de edição para templates aprovados.
- [ ] Exibir toast de sucesso/erro apropriado ao contexto de edição.

**Frontend - Lista (`templates-view.tsx`):**
- [ ] Condicionar botão "Editar" ao status do template (`APPROVED`, `REJECTED`, `PAUSED`).
- [ ] Desabilitar/ocultar edição para templates com status `PENDING` (em análise).
- [ ] Passar dados do template selecionado corretamente ao drawer de edição.

#### 5.1.3) Payload de Exemplo (Update)

```json
// PUT /api/v1/whatsapp/templates
{
  "templateId": "1234567890",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Atualização de Agendamento"
    },
    {
      "type": "BODY",
      "text": "Olá {{1}}, seu agendamento para {{2}} foi confirmado.",
      "example": {
        "body_text": [["Maria", "amanhã às 14h"]]
      }
    },
    {
      "type": "FOOTER",
      "text": "WhaTrack - Gestão Inteligente"
    }
  ]
}
```

### 5.2) Implementação 2: Limpeza de Código Morto

#### 5.2.1) Contexto

Durante a evolução do editor de templates, foram criadas múltiplas versões do mesmo componente. A `TemplatesView` hoje usa `CrudEditDrawer` + `TemplateEditorForm`, tornando os componentes antigos órfãos. Manter esse código morto gera confusão, aumenta o tamanho do bundle, e dificulta a manutenção.

#### 5.2.2) Tarefas

**Remover `CreateTemplateDialog.tsx`:**
- [ ] Verificar que nenhum outro componente importa `CreateTemplateDialog`.
- [ ] Remover o arquivo `src/features/whatsapp/components/dialogs/create-template-dialog.tsx`.
- [ ] Remover qualquer import ou referência restante no codebase.

**Remover `TemplateEditorPanel.tsx`:**
- [ ] Verificar que nenhum outro componente importa `TemplateEditorPanel`.
- [ ] Remover o arquivo `src/features/whatsapp/components/template-editor/template-editor-panel.tsx`.
- [ ] Remover qualquer import ou referência restante no codebase.

**Validação:**
- [ ] Executar build (`npm run build`) para garantir que nenhuma referência quebrada existe.
- [ ] Testar o fluxo completo de criar/editar/excluir templates após a limpeza.

#### 5.2.3) Mapa de Dependências (pré-limpeza)

```
TemplatesView.tsx
  ├── CrudEditDrawer (slot de conteúdo)
  │   └── TemplateEditorForm.tsx  ← MANTER (componente ativo)
  │       └── TemplatePreview.tsx  ← MANTER
  ├── DeleteConfirmDialog.tsx  ← MANTER
  │
  ├── CreateTemplateDialog.tsx  ← REMOVER (não importado)
  └── TemplateEditorPanel.tsx  ← REMOVER (não importado)
      └── TemplateEditorForm.tsx (duplicado)
      └── TemplatePreview.tsx (duplicado)
```

## 6) Fluxo de Dados (Arquitetura)

```
┌───────────────────────────────────────────────────────────┐
│  Frontend (React)                                         │
│                                                           │
│  TemplatesView                                            │
│    ├─ useQuery('templates') → whatsappApi.getTemplates()  │
│    ├─ CrudEditDrawer                                      │
│    │   └─ TemplateEditorForm                              │
│    │       ├─ CREATE → whatsappApi.createTemplate()       │
│    │       └─ UPDATE → whatsappApi.updateTemplate()  ←NEW │
│    └─ DeleteConfirmDialog                                 │
│        └─ whatsappApi.deleteTemplate()                    │
└──────────────┬────────────────────────────────────────────┘
               │ fetch()
               ▼
┌───────────────────────────────────────────────────────────┐
│  API Route (/api/v1/whatsapp/templates)                   │
│                                                           │
│  GET    → MetaCloudService.getTemplates()                 │
│  POST   → MetaCloudService.createTemplate()               │
│  PUT    → MetaCloudService.editTemplate()  ←NEW           │
│  DELETE → MetaCloudService.deleteTemplate()               │
└──────────────┬────────────────────────────────────────────┘
               │ fetch()
               ▼
┌───────────────────────────────────────────────────────────┐
│  Meta Graph API                                           │
│                                                           │
│  GET  /{WABA_ID}/message_templates                        │
│  POST /{WABA_ID}/message_templates     (criar)            │
│  POST /{TEMPLATE_ID}                   (editar)  ←NEW     │
│  DELETE /{WABA_ID}/message_templates?name=...  (excluir)  │
└───────────────────────────────────────────────────────────┘
```

## 7) Regras de Negócio

### 7.1) Criação de Template
1. Nome deve ser lowercase, sem espaços (usar underscores).
2. Categoria obrigatória: `MARKETING`, `UTILITY` ou `AUTHENTICATION`.
3. Idioma obrigatório (padrão `pt_BR`).
4. Body é obrigatório; Header e Footer são opcionais.
5. Se o body contiver variáveis (`{{1}}`, `{{2}}`), amostras (samples) são obrigatórias.
6. O campo `parameter_format: 'positional'` deve ser enviado.

### 7.2) Edição de Template
1. Apenas templates `APPROVED`, `REJECTED` ou `PAUSED` podem ser editados.
2. Nome, categoria e idioma **não** podem ser alterados.
3. Templates aprovados: máximo 10 edições em 30 dias, 1 por cada 24h.
4. Toda edição dispara re-aprovação pela Meta.

### 7.3) Exclusão de Template
1. A exclusão é por **nome**, não por ID.
2. Excluir um template remove **todas as traduções** (idiomas) desse template.
3. Ação irreversível — confirmar antes de executar.

## 8) Critérios de Aceite

- [ ] **CREATE**: Usuário cria template com body, samples e preview → template aparece na lista com status `PENDING`.
- [ ] **READ**: Lista exibe todos os templates com status, categoria, idioma e preview do body.
- [ ] **UPDATE**: Usuário edita template aprovado/rejeitado → campos nome/categoria/idioma bloqueados → template atualizado na Meta.
- [ ] **DELETE**: Usuário confirma exclusão → template removido da Meta e da lista.
- [ ] **LIMPEZA**: Build passa sem erros após remoção dos componentes órfãos.
- [ ] **PREVIEW**: Preview reflete alterações em tempo real durante criação/edição.
- [ ] **VALIDAÇÃO**: Formulário impede submissão sem body, sem samples (quando há variáveis), ou com nome inválido.
- [ ] **ERROS**: Mensagens de erro claras para: limite de edições atingido, template não editável, erro de rede, erro da API Meta.

## 9) Fases de Implementação

| Fase | Descrição | Risco | Prioridade |
|:---|:---|:---|:---|
| **Fase 1** | Implementar `editTemplate` no `MetaCloudService` e handler `PUT` na rota API. | Baixo | 🔴 Alta |
| **Fase 2** | Implementar `updateTemplate` no client API e ajustar `TemplateEditorForm` pro modo edição. | Médio | 🔴 Alta |
| **Fase 3** | Remover `CreateTemplateDialog.tsx` e `TemplateEditorPanel.tsx`. | Baixo | 🟡 Média |
| **Fase 4** | Testes end-to-end e polimento de UX (toasts, loading states, limites visuais). | Baixo | 🟢 Normal |

## 10) Referências

- **Meta Graph API - Message Templates**: `POST /{WABA_ID}/message_templates` (criar) / `POST /{TEMPLATE_ID}` (editar)
- **Limites de edição**: Até 10x em 30 dias para templates aprovados, 1x por 24h.
- **Documentação oficial**: [developers.facebook.com/docs/whatsapp/business-management-api/message-templates](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- **App Review**: Este PRD é pré-requisito para a demonstração da permissão `whatsapp_business_management` no vídeo de revisão.
- **Relatório de verificação**: `app_verification.md` (detalhes do App Review e produção dos vídeos).
- **PRD de Organização**: `ORGANIZACAO-SAAS-PRD.md` (estrutura de pastas e arquitetura do SaaS).
