# Context: Template Center para Funis de Negociacao

**Ultima atualizacao:** 2026-05-18  
**Versao:** 2.0 (Refactor: Status Groups + Meta Event Mapping)

---

## 📌 Definicao

O Template Center e um repositório de configuracoes de pipeline comercial prontas para uso. Ele abstrai a complexidade de decidir quais fases usar e qual evento Meta CAPI configurar em cada fase, oferecendo "blueprints" por nicho com status groups semanticamente corretos (ACTIVE, WON, LOST).

**O que e:**

- Uma biblioteca visual de processos de vendas (tipo ClickUp).
- Um "instalador" de configuracoes (fases + cores + status group + evento Meta sugerido).
- Um configurador visual de eventos Meta por stage (o usuario escolhe qual evento disparar).
- Uma ferramenta de onboarding para reduzir o time-to-value.

**O que NAO e:**

- Um sistema que envia eventos Meta em tempo real (implementado em T5, nao agora).
- Um sistema de automacao de marketing por email/whatsapp.
- Um criador de landing pages.

---

## 🔄 Fluxo de Experiencia do Usuario

### 1. Tela de Pipeline/Funil (Kanban ou Configurações)

Usuario está vendo o pipeline atual (Kanban board ou tela de stages).

### 2. Modal "Edit Stages" (tipo Notion)

- Click em botão "Editar Stages" ou ícone gear em cima do Kanban
- Abre MODAL (não página separada)
- **Layout 2-Colunas:**

**ESQUERDA: Lista de Templates**
```
Use Space statuses
[Content Chris] ← template selecionado (highlighted)
TEMPLATES (5)
├─ Vendas Padrão
├─ Imobiliária
├─ SaaS B2B
├─ E-commerce
├─ Estética/Saúde
└─ [+ New template]
```
- Click num template = carrega estágios DIREITA
- "New template" = criar custom baseado no atual

**DIREITA: Status Groups (tipo Notion)**
```
ACTIVE STATUSES
├─ Lead (20%) [corbox cinza] [evento: Lead] [...]
├─ Qualificado (40%) [corbox] [evento: Lead] [...]
├─ Proposta (80%) [corbox] [evento: None] [...]

DONE STATUSES (vazio ou drag aqui)
└─ Move statuses here...

CLOSED STATUSES
└─ Ganho (100%) [corbox verde] [evento: Purchase] [...]
```

### 3. Interacoes

**Sidebar (Esquerda):**
- Click template = carrega estágios no lado direito
- Highlight template selecionado em azul

**Status Groups (Direita):**
- Cada status é uma row com:
  - Cor (corbox)
  - Nome + probability (editável inline)
  - Ícone expandir para ver evento Meta
  - Menu "..." (delete, duplicate, etc.)
- Drag-drop status entre grupos (futuro, pode deixar static por agora)
- "+ Add Status" botão em cada grupo (criar novo stage local)

**Expandir Status (ao clicar nome ou ícone):**
- Abre inline ou submenu:
  - Nome + probability (editável)
  - Dropdown "Evento Meta": None, Lead, Purchase, ViewContent, Schedule, etc.
  - Checkboxes: Incluir email? Incluir telefone? etc.

### 4. Salvamento

- Botão "Save" (base modal) = salva configuracao do template
- Se novo: cria DealStageMetaEventMapping para cada stage
- Se existente: atualiza
- Fecha modal → Kanban atualizado
- Toast: "Stages salvos com sucesso"

---

## 💾 Modelagem de Dados (Refatorada)

### DealStageTemplate

```prisma
model DealStageTemplate {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String
  description String?
  category    String   // Real Estate, SaaS, Ecommerce, etc.
  icon        String?  // Nome do icone Lucide ou URL
  isPopular   Boolean  @default(false)
  
  items       DealStageTemplateItem[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("crm_deal_stage_templates")
}

model DealStageTemplateItem {
  id            String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  templateId    String  @db.Uuid
  name          String
  color         String
  order         Int
  
  // Status Group (semantica correta: progresso vs resultado)
  statusGroup   String  // "ACTIVE", "WON", "LOST", "PAUSED"
  probability   Int     // 0-100 (forecast de conversao)
  isFinal       Boolean @default(false) // Se true, nao pode voltar pra trás
  
  // Meta CAPI Sugerido (usuario pode customizar)
  suggestedMetaEventName String?  // Ex: "Purchase", "Lead", null
  suggestedMetaEventValue Decimal? // Valor esperado
  
  template      DealStageTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@map("crm_deal_stage_template_items")
}

model DealStageMetaEventMapping {
  id            String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  dealStageId   String  @db.Uuid
  projectId     String  @db.Uuid
  
  // O que o usuario escolheu disparar nesta fase
  metaEventName String  // Purchase, Lead, ViewContent, etc. (pode ser diferente do sugerido)
  
  // Quais dados incluir (customizável)
  includeEmail  Boolean @default(true)
  includePhone  Boolean @default(true)
  includeFullName Boolean @default(true)
  includeAddress Boolean @default(true)
  includeExternalId Boolean @default(true)
  
  // Custom fields (JSON)
  customDataMapping Json?  // {"revenue": "deal.value", "product_id": "deal.customField"}
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([dealStageId, projectId])
  @@map("crm_deal_stage_meta_event_mappings")
}
```

---

## 📊 Categorias de Industria + Status Groups

| Categoria | ACTIVE Stages | WON | LOST | Evento CAPI Sugerido |
|-----------|--------------|-----|------|----------------------|
| **Vendas Padrão** | Novo (20%) → Qualificado (40%) → Proposta (80%) | Ganho (100%) | Perdido (0%) | Lead, Purchase |
| **Imobiliária** | Lead → Visita Agendada (40%) → Proposta (70%) | Vendido (100%) | Desistiu (0%) | Schedule, Purchase |
| **SaaS B2B** | Triagem (20%) → Demo (50%) → Trial (70%) → Proposta (90%) | Ativo (100%) | Não Converteu (0%) | Lead, StartTrial, Purchase |
| **E-commerce** | Carrinho Abandonado (10%) → Pagto Pendente (50%) | Pago (100%) | Expirado (0%) | InitiateCheckout, Purchase |
| **Estética/Saúde** | Interessado (20%) → Avaliação (60%) → Agendado (80%) | Realizado (100%) | Cancelado (0%) | Schedule, ViewContent, Purchase |

**Notas:**
- Cada stage ACTIVE tem probability (percentual de chance de conversao)
- WON sempre dispara evento de conversao final (probability 100%)
- LOST nao dispara CAPI (ou dispara com flag de perda, futura decisao)
- Probability usa para forecasting: Deal Value × Probability = Pipeline Value

---

## 📝 Resumo Tecnico para Implementacao

### Frontend (T3: Modal)

- **Modal "Edit Stages":** 
  - 2-column layout (sidebar templates | status groups)
  - Sidebar: Lista de templates salvos (clickable)
  - Direita: 3-group status (ACTIVE, DONE, CLOSED) em boxes tipo Notion
  - Cada status: row com cor, nome, probability, ícone expandir, menu
  - Expandir status: mostra evento Meta dropdown + checkboxes user_data
  - "+ Add Status" buttons em cada grupo (criar novo stage)
  - "Save" button (base) salva tudo

- **Reutilizacao:**
  - Usar componentes Kanban existentes
  - Nova modal container `EditStagesModal.tsx`
  - Componentes filhos: `TemplateList`, `StatusGroupsEditor`, `StatusRowExpander`

### Backend (T1 + T2)

- **Schema:** 
  - Expandir `DealStageTemplateItem` com `statusGroup`, `probability`, `suggestedMetaEventName`
  - Criar `DealStageMetaEventMapping` (usuario escolhe evento por stage)

- **Migracao:** npx prisma migrate dev --name add_status_groups_meta_events

- **Seed:** Popula 5 templates com status groups + eventos sugeridos

### Fluxo de Salvamento (T3) com BullMQ + Polling

1. Usuario abre modal na tela de funil
2. Clica num template na sidebar
3. Carrega stages direita (agrupados em 3-groups)
4. Edita: expande para mudar evento Meta (ou deixa default)
5. Clica "Save"
6. API POST `/api/v1/projects/{projectId}/stages` com payload:
   ```json
   {
     "templateId": "uuid",
     "remappings": {
       "oldStageId1": "newStageId1",
       "oldStageId2": "newStageId2"
     }
   }
   ```

7. **Backend enfileira BullMQ:**
   ```ts
   const job = await stagesQueue.add('apply-template', {
     projectId, templateId, remappings
   })
   return { jobId: job.id }
   ```

8. **Modal abre ProgressBar e faz polling:**
   ```ts
   setInterval(() => {
     GET /api/jobs/{jobId} → { progress, state }
     job.state === 'completed' → refetch + close
   }, 500)
   ```

9. **Worker (`src/worker.ts`) processa:**
   - Loop batch 500 deals por vez
   - job.progress(0...100) atualiza
   - Transação final (deletar stages antigos + criar novos)
   - job.state → 'completed'

10. UI atualiza progress bar → refetch Kanban → Modal fecha

### Armazenamento

- `DealStage`: name, color, order, statusGroup, probability (novo)
- `DealStageMetaEventMapping`: dealStageId, projectId, metaEventName, includeEmail, etc (novo)
- **Redis (BullMQ):** Job queue armazena progress temporariamente
