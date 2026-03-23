# Quick Start: PRD-022 AI Cadence Engine

## Pre-requisitos

- PRD-018 concluido (modelos no schema, Inngest configurado, AiEventService)
- PRD-012 concluido (skill-runner.ts, whatsapp-ai-send.service.ts)

## Ordem de execucao

```bash
# Os modelos ja existem no schema (PRD-018)
# Nao e necessario rodar migrate

# 1. Rodar seed de cadencias exemplo
npx prisma db seed  # inclui ai-cadences.ts

# 2. Implementar services (T1-T2)
# Criar ai-cadence-runner.service.ts
# Criar ai-cadence-enrollment.service.ts

# 3. Criar functions Inngest (T3-T4)
# Criar cadence-step.ts
# Criar cadence-cron.ts
# Registrar as functions no /api/inngest/route.ts

# 4. Integrar interrupcao no messageHandler (T5)
# Modificar message.handler.ts

# 5. Criar CRUD services + APIs (T7-T12)
# Criar ai-cadence.service.ts
# Criar routes

# 6. UI (T13-T16)
# Adicionar cadencias ao AI Studio
# Adicionar enrollment no ticket panel

# 7. Validar
npm run lint
npm run build
npm run test
```

## Validacao rapida pos-execucao

```bash
# Verificar functions Inngest registradas
# Acessar: http://localhost:8288 (Inngest Dev Server)
# Deve exibir: process-cadence-step, cadence-cron

# Criar enrollment de teste via API
curl -X POST /api/v1/ai/cadences/{cadenceId}/enroll \
  -H "Content-Type: application/json" \
  -d '{ "leadId": "..." }'

# Verificar nextStepAt no banco
# SELECT * FROM ai_cadence_enrollments WHERE lead_id = '...'

# Aguardar cron ou disparar manualmente no Inngest Dev
# Verificar AiEvent gerado
# SELECT * FROM ai_events WHERE lead_id = '...' ORDER BY created_at DESC
```

## Arquivos criados neste PRD

```
src/
  lib/
    inngest/
      functions/
        cadence-step.ts          # Function de execucao de step
        cadence-cron.ts          # Cron de polling a cada 5 minutos
  services/
    ai/
      ai-cadence.service.ts                   # CRUD de cadencias e steps
      ai-cadence.service.spec.ts
      ai-cadence-runner.service.ts            # Execucao window-aware de steps
      ai-cadence-runner.service.spec.ts
      ai-cadence-enrollment.service.ts        # Enrollment, pausa, interrupcao
      ai-cadence-enrollment.service.spec.ts
  app/
    api/v1/ai/
      cadences/route.ts
      cadences/[cadenceId]/route.ts
      cadences/[cadenceId]/activate/route.ts
      cadences/[cadenceId]/steps/route.ts
      cadences/[cadenceId]/steps/[stepId]/route.ts
      cadences/[cadenceId]/enroll/route.ts
      cadences/[cadenceId]/enrollments/route.ts
      enrollments/[enrollmentId]/pause/route.ts
      enrollments/[enrollmentId]/resume/route.ts
      enrollments/[enrollmentId]/interrupt/route.ts
      leads/[leadId]/enrollments/route.ts
  schemas/
    ai/
      ai-cadence.schema.ts
  components/
    dashboard/
      ai/
        cadences/
          cadences-content.tsx
          cadence-editor.tsx
          cadence-step-form.tsx
prisma/
  seeds/
    ai-cadences.ts
```

## O que este PRD NAO entrega

- Analytics de performance de cadencia → V2
- Branches condicionais por resposta do cliente → V2
- A/B testing de steps → V2
- Cadencia disparada por campanha → PRD-021
