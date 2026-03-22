# TASKS — PRD-016

## Visão Geral

Reestruturação completa da área de WhatsApp.
URL: `/settings/whatsapp` com `HeaderPageShell` + `HeaderTabs` (3 tabs).
Referência: ManyChat. Foco em UX/UI agradável e intuitivo.

---

## Fase A — Backend

### A1: Endpoint de perfil por instância específica
**Arquivo:** `src/app/api/v1/whatsapp/phone-numbers/[phoneId]/profile/route.ts`

`GET` que:
1. `validateFullAccess` para orgId
2. Valida que `phoneId` (Meta ID) pertence a um `WhatsAppConfig` da org (lookup DB: `prisma.whatsAppConfig.findFirst({ where: { phoneId, organizationId } })`)
3. Chama `MetaCloudService.getBusinessProfile({ phoneId })`
4. Retorna o perfil

Corrige bug atual: `GET /api/v1/whatsapp/business-profile` usa sempre o primeiro config da org.

---

### A2: Adicionar `getPhoneProfile` no client.ts
**Arquivo:** `src/lib/whatsapp/client.ts`

```typescript
async getPhoneProfile(phoneId: string, orgId: string): Promise<WhatsAppBusinessProfile | null>
// GET /api/v1/whatsapp/phone-numbers/${phoneId}/profile
```

---

## Fase B — Tab Conta

### B1: Criar `AccountTab`
**Arquivo:** `src/components/dashboard/whatsapp/settings/account-tab.tsx`

Recebe `organizationId` e `projectId` do contexto.

**Lógica de estados:**
1. Busca instância do projeto via `GET /api/v1/whatsapp/instances?projectId=[projectId]`
2. Se `items.length === 0` → empty state com botão "Conectar WhatsApp" (onboarding)
3. Se instância existe → renderiza `InstanceCardDetail` (ver B2)

**Ação primária (passada para hub):**
- Sem instância: "Conectar WhatsApp"
- Com instância: "Enviar Teste" → abre `SendTestSheet`

---

### B2: Criar `InstanceCardDetail`
**Arquivo:** `src/components/dashboard/whatsapp/settings/instance-card-detail.tsx`

Recebe `phone: WhatsAppPhoneNumber`.

Layout:
```
┌─────────────────────────────────────────────────────────┐
│  [Flag] +55 11 4863 5262    Prof Didática               │
│         [● Conectado]  [⚡ Alta Qualidade]  [SANDBOX?]  │
│         Phone ID: ...  |  WABA ID: ...                  │
├─────────────────────────────────────────────────────────┤
│  PERFIL COMERCIAL                                       │
│  [foto]  Nome verificado   [badge: categoria]           │
│          "Texto sobre a empresa..."                     │
│          ✉ email   🌐 site   📍 endereço               │
│                      [→ Editar no Business Manager]     │
├─────────────────────────────────────────────────────────┤
│  Tier Standard · 1.000 msgs/dia · Cloud API · Live      │
└─────────────────────────────────────────────────────────┘
```

Badges status/quality/sandbox conforme spec do CONTEXT.md.
Usa `whatsappApi.getPhoneProfile(phone.id, orgId)` para o perfil.

---

### B3: Criar `SendTestSheet`
**Arquivo:** `src/components/dashboard/whatsapp/send-test-sheet.tsx`

Sheet lateral (right). Props: `phone`, `open`, `onOpenChange`, `initialTemplate?`.

Conteúdo:
1. Combobox de templates APPROVED com busca por nome
2. Preview da mensagem selecionada (renderiza BODY com variáveis substituídas)
3. Inputs dinâmicos para variáveis (detectados do BODY do template)
   - Label = nome da variável (ex: "nome do cliente"), não "{{1}}"
4. Input: número destino formato internacional
5. Botão "Enviar" → `whatsappApi.sendTemplate(...)` → toast sucesso/erro

---

## Fase C — Tab Templates

### C1: Refatorar `TemplatesView` para tabela
**Arquivo:** `src/components/dashboard/whatsapp/settings/templates-view.tsx`

- Remover `ViewSwitcher`, `CrudDataView`, cards
- Implementar tabela: **Nome | Categoria | Idioma | Status**
- Status: ícone + texto colorido (não Badge separado)
  - `APPROVED` → `<CheckCircle2 />` verde + "Aprovado"
  - `REJECTED` → `<XCircle />` laranja + "Reprovado" + Tooltip com `rejected_reason`
  - `PENDING` → `<Clock />` muted + "Em análise"
  - `DISABLED` → `<MinusCircle />` muted + "Desativado"
- Kebab (⋮) por linha: Editar | Enviar Teste | Excluir
- Sem `HeaderPageShell` próprio (o hub já provê)
- Recebe `searchValue`, `categoryFilter`, `statusFilter` como props (do hub)
- "+ Novo Template" → abre `TemplateNewDialog` (ver C2)

---

### C2: Criar fluxo de criação/edição de template

#### C2a: `TemplateNewDialog`
**Arquivo:** `src/components/dashboard/whatsapp/template-editor/template-new-dialog.tsx`

Dialog modal simples para configurar antes de abrir o editor:
- Radio: categoria (Marketing / Utilidade / Autenticação)
- Select: sub-tipo (muda conforme categoria — ver CONTEXT.md)
- Select: idioma (pt_BR padrão)
- Botão "Continuar →" → abre `TemplateEditorPage` passando os valores via query params ou estado

#### C2b: `TemplateEditorForm`
**Arquivo:** `src/components/dashboard/whatsapp/template-editor/template-editor-form.tsx`

Layout 2 colunas (editor + preview celular). **Sem stepper** — tudo visível de uma vez.

**Header da página:**
- `← Voltar` (confirma se há alterações não salvas)
- Nome do template (input inline editável)
- Categoria · Sub-tipo · Idioma (badges read-only — definidos no dialog)
- `[Salvar rascunho]` `[Enviar para Revisão]`

**Coluna esquerda — Editor:**
- **Cabeçalho** (opcional): select Nenhum/Texto/Imagem/Vídeo/Arquivo + input/upload conforme tipo
- **Corpo** (obrigatório): textarea com chips de variável
  - Botão `[+ Variável]` insere `{{nome}}` na posição do cursor
  - Selector de tipo de variável: `Nome` (padrão, ex: `{{order_id}}`) ou `Número` (ex: `{{1}}`)
  - Variáveis renderizadas como chips azuis no preview
- **Exemplos de variáveis**: pares `label → input` (preenchidos pelo usuário, enviados à Meta)
- **Rodapé** (opcional): input de texto simples
- **Botões** (opcional): select tipo (URL Button / Reply Button) + campos dinâmicos
  - URL Button: Button Text + URL + Variável de URL (opcional)
  - Reply Button: até 3 botões de texto. "+ Adicionar botão"
- **Período de validade** (só se categoria = Utilidade): select 1h/3h/6h/12h/24h/Nenhum

**Coluna direita — Preview celular:**
- Mockup de iPhone com fundo de chat WhatsApp
- Renderiza header, body, footer, botões em tempo real
- Substitui variáveis pelos valores de exemplo
- Atualiza a cada keystroke (sem debounce agressivo — é leve)

**Ao clicar "Enviar para Revisão":**
- Converte variáveis nomeadas para posicionais internamente: `{{nome do cliente}}` → `{{1}}`
- Monta payload Meta com `example.body_text`
- Chama `whatsappApi.createTemplate()` → toast + redirect para lista

---

## Fase D — WhatsAppSettingsHub

### D1: Atualizar `WhatsAppSettingsHub`
**Arquivo:** `src/components/dashboard/whatsapp/settings/whatsapp-settings-hub.tsx`

**Tabs:**
```typescript
type Tab = 'conta' | 'templates' | 'webhook'
```

**Header por tab:**
- `conta`: sem search, sem filtro, ação primária vem do `AccountTab`
- `templates`: search "Buscar template...", filtros (categoria + status), "+ Novo Template"
- `webhook`: sem search, filtros (tipo evento + período), sem ação primária

**Invalidação por tab:**
- `conta` → `['whatsapp', 'instances', projectId]`
- `templates` → `['whatsapp', 'templates', orgId]`
- `webhook` → `['whatsapp', 'webhook', 'logs', orgId]`

**Renderização:**
```
tab === 'conta'     → <AccountTab ... />
tab === 'templates' → <TemplatesView searchValue={searchValue} ... />
tab === 'webhook'   → <WebhooksView ... />  (já existe, não muda)
```

**Remover:** uso de `WhatsAppSettingsPage` (lista de instâncias) — substituída por `AccountTab`.

---

## Fase E — Limpeza

### E1: Deletar `WhatsAppSettingsPage`
**Arquivo:** `src/components/dashboard/whatsapp/settings/whatsapp-settings-page.tsx`

Substituída pelo `AccountTab`. Pode ser removida após D1.

### E2: Simplificar/deletar `OverviewView`
**Arquivo:** `src/components/dashboard/whatsapp/settings/overview-view.tsx`

Lógica absorvida por `AccountTab` + `InstanceCardDetail`. Pode ser removida.

### E3: Remover sub-páginas obsoletas (opcional)
- `[phoneId]/settings/page.tsx` — perfil agora na tab Conta
- `[phoneId]/send-test/page.tsx` — envio agora é SendTestSheet

---

## Ordem de Execução

```
A1 → A2           (backend — corrige bug de perfil)
B1 → B2 → B3     (tab Conta)
C1 → C2a → C2b   (tab Templates)
D1                (hub com 3 tabs)
E1 → E2 → E3     (limpeza)
```

## Resumo de Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `phone-numbers/[phoneId]/profile/route.ts` |
| Criar | `account-tab.tsx` |
| Criar | `instance-card-detail.tsx` |
| Criar | `send-test-sheet.tsx` |
| Criar | `template-new-dialog.tsx` |
| Criar | `template-editor-form.tsx` |
| Modificar | `client.ts` |
| Modificar | `templates-view.tsx` (tabela + sem HeaderPageShell) |
| Modificar | `whatsapp-settings-hub.tsx` (3 tabs) |
| Deletar | `whatsapp-settings-page.tsx`, `overview-view.tsx` |
| Deletar (opcional) | `[phoneId]/settings/page.tsx`, `[phoneId]/send-test/page.tsx` |
