# Tasks: PRD-001 Feature Architecture Migration

**Data:** 2026-05-17 | **Status:** Draft | **Total Tasks:** 16 | **Estimado:** 10-14 semanas

---

## Regra Global de Fechamento

Toda task deste documento segue checklist obrigatorio de encerramento:

- [ ] `npm run lint` executado sem erro
- [ ] `npm run test` executado sem erro, ou bloqueio documentado
- [ ] `npm run build` executado sem erro, ou bloqueio documentado
- [ ] `git commit` realizado com escopo do dominio/task

Padrao de commit recomendado:

```bash
git add -A
git commit -m "refactor(<domain>): <task-id> <resumo>"
```

Sem esses itens, a task nao pode ser marcada como concluida.

---

## Regra Estrutural Obrigatoria (Sem Excecao)

Tudo que for **especifico de dominio** deve ficar em `src/features/[domain]`.

Isso vale para:

- `components`
- `hooks`
- `services`
- `schemas`
- `repositories`
- `queries` e `mutations`

Somente pode permanecer fora de `features` o que for realmente compartilhado/global, por exemplo:

- `src/components/ui/**`
- `src/components/shared/**`
- `src/server/**` (auth, acesso, contexto e infraestrutura server compartilhada)
- `src/lib/**` de utilitarios cross-domain

Proibicoes:

- Nao criar camada de compatibilidade em `src/services/**` ou `src/schemas/**` para dominio migrado.
- Nao manter componente de dominio em `src/components/dashboard/**` apos migracao do dominio.
- Nao manter hook de dominio em `src/hooks/**` apos migracao do dominio.

Definicao pratica:

- Se o arquivo atende apenas um dominio, ele deve ser movido para `src/features/[domain]`.
- Se o arquivo atende 2+ dominios de forma neutra, pode ficar em camada compartilhada.

---

## Revisao Obrigatoria Antes de Cada Dominio

Antes de iniciar qualquer dominio, revisar e classificar arquivos destes diretorios:

- `src/components`
- `src/hooks`
- `src/services`
- `src/schemas`
- `src/lib`
- `src/server`
- `src/types`

Checklist da revisao:

- [ ] Mapear arquivos do dominio fora de `features`
- [ ] Definir destino final por arquivo (`features` vs compartilhado)
- [ ] Incluir no escopo da task a remocao do caminho legado
- [ ] Garantir que imports finais nao apontam para caminho legado do dominio

---

## 🔴 Fase 1: Fundacao Arquitetural (1-2 semanas)

### T1: Definir estrutura alvo e contratos de camada (2-3 dias)

**Problema:** ausencia de padrao unico por feature.

**Localizacao:** `src/features` (novo), `docs/architecture` (presumido)

**O que fazer:**

1. Criar template base de `features/[domain]`.
2. Definir contratos de `services`, `repositories`, `schemas`, `index.ts`, `server.ts`.
3. Documentar regras de import entre camadas.

**Aceitacao:**

- [ ] Estrutura base criada e versionada
- [ ] Contratos de camada documentados
- [ ] Exemplo de feature referencia criado
- [ ] `lint`, `test`, `build` e `commit` executados

### T2: Criar guardrails de arquitetura (2-3 dias)

**Problema:** sem enforcement automatico.

**Localizacao:** `eslint.config.mjs`, scripts de CI

**O que fazer:**

1. Regras para bloquear import de `db` em routes.
2. Regras para bloquear cross-feature indevido.
3. Check de `server-only` em camadas server.

**Aceitacao:**

- [ ] CI falha quando route importa db
- [ ] CI alerta cross-feature proibido
- [ ] CI valida presenca de `server-only`
- [ ] `lint`, `test`, `build` e `commit` executados

### T3: Preparar templates de migracao por dominio (1-2 dias)

**Problema:** risco de cada time migrar diferente.

**Localizacao:** `scripts/` e docs internas

**O que fazer:**

1. Template de checklist por dominio.
2. Template de testes de regressao por dominio.

**Aceitacao:**

- [ ] Checklist padrao disponivel
- [ ] Plano de regressao padrao disponivel
- [ ] `lint`, `test`, `build` e `commit` executados

### T4: Dominio piloto `items` (2-4 dias) - concluido

**Problema:** validar estrategia antes de escala.

**Localizacao:** `src/app/api/v1/items/**`, `src/services/items/**`, `src/schemas/items/**`

**O que fazer:**

1. Migrar `items` para `src/features/items`.
2. Extrair repositories por operacao, com um arquivo por operação de banco.
3. Manter contrato HTTP atual.

**Aceitacao:**

- [ ] Sem quebra de endpoint existente
- [ ] Service sem acesso direto a db
- [ ] Route sem import de db
- [ ] Testes de `items` verdes
- [ ] `lint`, `test`, `build` e `commit` executados

---

## 🟡 Fase 2: Dominios Core (3-4 semanas)

### T5: Migrar `organizations` (4-6 dias)
### T6: Migrar `projects` (3-5 dias)
### T7: Migrar `item-categories` (2-4 dias) - concluido
### T8: Migrar `leads` + `sales` (5-7 dias) - concluido

**Problema:** dominios base da operacao concentram regras de acesso e dados criticos.

**Localizacao:** `src/app/api/v1/organizations`, `src/app/api/v1/projects`, `src/app/api/v1/leads`, `src/app/api/v1/sales`, `src/services/**`

**O que fazer:**

1. Migrar por dominio, preservando contratos publicos.
2. Extrair repositories e schemas para cada feature.
3. Garantir `repositories/` com um arquivo por operação de banco.
4. Ajustar testes de integracao e unidade.
5. Mover para `features/[domain]` todos os componentes/hooks/services/schemas nao compartilhados do dominio.

**Aceitacao:**

- [ ] Dominios core sem acesso db em routes
- [ ] Repositories criados por operacao principal, um arquivo por operação
- [ ] Sem artefato legado de dominio em `src/services`, `src/schemas`, `src/components/dashboard`, `src/hooks`
- [ ] Cobertura minima preservada, a confirmar baseline
- [ ] Cada dominio core finalizado com `lint`, `test`, `build` e `commit`

---

## 🟢 Fase 3: Dominios de Crescimento (3-4 semanas)

### T9: Migrar `tickets` + `ticket-stages` (4-6 dias)
### T10: Migrar `whatsapp` (6-9 dias)
### T11: Migrar `meta-ads` (4-6 dias)
### T12: Migrar `analytics` + `dashboard` (4-6 dias)

**Problema:** dominios com alta variacao funcional e integracoes externas.

**Localizacao:** `src/app/api/v1/tickets`, `src/app/api/v1/whatsapp`, `src/app/api/v1/meta-ads`, `src/services/**`

**O que fazer:**

1. Migrar por subdominio dentro de cada dominio grande.
2. Garantir limites de integracao externa em services dedicados.

**Aceitacao:**

- [ ] Contratos HTTP preservados
- [ ] Latencia dentro do aceitavel, a confirmar SLO
- [ ] Regressao funcional coberta por testes principais
- [ ] Cada dominio da fase finalizado com `lint`, `test`, `build` e `commit`

---

## 🟢 Fase 4: Perifericos e Hardening (3-4 semanas)

### T13: Migrar `billing` (4-6 dias)
### T14: Migrar `onboarding` + `company` + `contact` + `me` (4-6 dias)
### T15: Migrar `system` + `cron` + `conversations` + `account` (4-6 dias)
### T16: Limpeza de legado e corte final (3-5 dias)

**Problema:** reduzir legado remanescente e consolidar governanca.

**Localizacao:** `src/services/**`, `src/app/api/**`, `src/lib/**` (trechos de dominio)

**O que fazer:**

1. Encerrar migracao dos dominios restantes.
2. Remover caminhos legados e dead code.
3. Publicar guia final de arquitetura e ownership.
4. Garantir que `src/components`, `src/hooks`, `src/services` e `src/schemas` contenham apenas shared/global.

**Aceitacao:**

- [ ] `src/services` legado reduzido ao minimo necessario
- [ ] Guardrails impedem regressao arquitetural
- [ ] Documento final de arquitetura publicado
- [ ] Cada dominio da fase finalizado com `lint`, `test`, `build` e `commit`

---

## 📊 Resumo

| Task | Tempo | Bloqueador |
|------|-------|------------|
| T1-T4 | 1-2 semanas | alinhamento tecnico |
| T5-T8 | 3-4 semanas | disponibilidade do time de dominios core |
| T9-T12 | 3-4 semanas | integracoes externas |
| T13-T16 | 3-4 semanas | limpeza de legado e estabilizacao |

**Total:** 10-14 semanas

---

**Status:** Draft pronto para execucao incremental.
