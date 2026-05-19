# Quick Start: PRD-006 Deal Stage Templates (V2.1)

**TL;DR:** Modal "Editar Stages" (tipo Notion) + BullMQ worker + polling. Sidebar templates + status groups (ACTIVE | WON | LOST) + evento Meta por stage. ProgressBar em tempo real. Sem envio real de evento ainda (T6).

---

## 🚀 Como Começar

```bash
# 1. Branch
git checkout -b feature/deal-stage-templates-v2

# 2. T1: Schema (3h)
# - Expandir DealStageTemplateItem: statusGroup, probability, suggestedMetaEventName
# - Criar DealStageMetaEventMapping
# - Migration: npx prisma migrate dev --name add_status_groups_meta_events
# - Resultado: Tabelas prontas

# 3. T2: Seed (2h)
# - Criar prisma/seeds/seed_deal_templates.ts
# - 5 templates: Vendas, Imobiliária, SaaS, E-commerce, Estética
# - Cada template com status groups + eventos sugeridos
# - npx prisma db seed

# 4. T3: Modal + BullMQ Worker (12h)
# 4.1 Criar fila: src/server/queues/stages.queue.ts
# 4.2 Criar API POST: src/app/api/v1/projects/[projectId]/stages/route.ts
# 4.3 Criar API GET: src/app/api/jobs/[jobId]/route.ts (polling endpoint)
# 4.4 Adicionar worker em src/worker.ts (novo bloco applyTemplateWorker)
# 4.5 Criar service: src/features/deal-stages/services/apply-template.service.ts
# 4.6 Criar UI: EditStagesModal.tsx + subcomponentes (Modal, ProgressBar, Polling)
# 4.7 Trigger: botão "Editar Stages" no Kanban

# 5. T4: Custom Templates (4h)
# - Button "New template" abre form
# - Salva stages atuais como novo template

# 6. T5: Onboarding (3h)
# - Detecta projeto novo (sem stages)
# - Mostra modal automaticamente

# 7. Run Worker + App
# Terminal 1:
npm run dev
# Terminal 2:
npm run worker
# ou via process manager (veja package.json)

# 8. Test
# Ir para Kanban > Clique "Editar Stages" > Modal abre
# Clique "Save" > ProgressBar mostra progresso
# Após 100% > Modal fecha > Kanban atualiza
```

---

## 📂 Arquivos Chave

**Schema & DB:**
- `prisma/schema.prisma` (T1: add statusGroup, probability, DealStageMetaEventMapping)
- `prisma/seeds/seed_deal_templates.ts` (T2: 5 templates)

**BullMQ & Worker:**
- `src/server/queues/stages.queue.ts` (T3: fila applyTemplate)
- `src/worker.ts` (T3: add applyTemplateWorker block)
- `src/features/deal-stages/services/apply-template.service.ts` (T3: batch logic)

**API:**
- `src/app/api/v1/projects/[projectId]/stages/route.ts` (T3: POST enqueue job)
- `src/app/api/jobs/[jobId]/route.ts` (T3: GET polling endpoint)

**UI Components (T3):**
- `src/features/dashboard/components/pipeline/EditStagesModal.tsx` (main container)
  - `TemplateSelector.tsx` (sidebar com templates)
  - `StatusGroupsEditor.tsx` (3-group layout)
  - `StatusRow.tsx` (expandível stage row)
  - `StatusExpander.tsx` (evento Meta dropdown + checkboxes)
  - `ProgressOverlay.tsx` (ProgressBar + polling 500ms)

---

## 🎯 User Journeys (Test Scenarios)

### 1. Novo Projeto (Onboarding)
```
1. Novo usuario cria projeto
2. Clica Kanban vazio
3. Modal "Editar Stages" aparece automaticamente
4. Sidebar mostra: Content Chris (default), Vendas, Imobiliária, SaaS, E-commerce, Estética
5. Click "Imobiliária"
6. Direita mostra:
   ACTIVE STATUSES
   ├─ Lead (20%) | Evento Meta: [None] ↓
   ├─ Visita Agendada (40%) | Evento Meta: [None] ↓
   ├─ Proposta (70%) | Evento Meta: [None] ↓
   CLOSED STATUSES
   └─ Vendido (100%) | Evento Meta: [Purchase] ↓
7. Click "Evento Meta" dropdown em Lead → muda para "Lead"
8. Expande Lead → checkboxes aparecem (email, phone, fullname, etc.)
9. Click "Save"
10. Modal fecha, Kanban atualizado com funil Imobiliária
```

### 2. Usuario Existente Muda de Template
```
1. Usuario com funil "Vendas Padrão" abre modal
2. Sidebar destaca "Content Chris" (template atual)
3. Click "SaaS B2B"
4. Direita mostra stages SaaS (Triagem, Demo, Trial, etc.)
5. Alert: "Vai sobrescrever as 3 fases atuais. Continuar?"
   - Botão "Continuar" → sobrescreve
6. Save → funil atualizado
```

### 3. Usuario Cria Custom Template
```
1. Usuario personaliza stages (mudar nomes, cores, eventos)
2. Click "+ New template"
3. Modal "Save as Template": Nome: "Meu Funil Customizado"
4. Save
5. Próxima vez, "Meu Funil Customizado" aparece em TEMPLATES list
```

### 4. Configurar Evento Meta
```
1. Modal aberta
2. Click stage "Proposta"
3. Click dropdown "Evento Meta"
4. Opcoes: None, Lead, Purchase, ViewContent, Schedule...
5. Escolhe "Purchase"
6. Expande row → checkboxes de user_data:
   ☑ Incluir email
   ☑ Incluir telefone
   ☑ Incluir nome completo
   ☐ Incluir endereço
7. Save → DealStageMetaEventMapping criada com essa config
```

---

## ⏭️ Próximas Fases (Futuro, não agora)

- **T6:** Integração com PRD-005 (Meta CAPI Worker)
  - PRD-005 worker consulta DealStageMetaEventMapping antes de enviar evento
  - Implementa full CAPI payload (user_data hashing + custom_data)
  - Testes: deal move → CAPI event disparado com dados corretos

- **T7:** Edição de eventos Meta em Configurações
  - Tela separada para revisar/ajustar eventos por stage
  - Sem modal, mais controlado

- **T8:** Drag-drop de stages entre grupos
  - Permitir reordenar stages dentro de ACTIVE/DONE/CLOSED
  - UI: drag handler em cada StatusRow

- **T9:** Compartilhamento de templates entre projetos
  - Salvar template global vs projeto-local
  - Copy-paste template entre projetos

---

**Status:** V2.1 with BullMQ + Polling. Pronto para T1.