# TDD Autopilot Workflow

Implementa Test-Driven Development com ciclo forçado: **RED → GREEN → COMMIT**

## Conceito

```
┌─────────────────────────────────────────────────────────┐
│  RED: Escreva teste que FALHA                           │
│  ↓                                                      │
│  GREEN: Implemente código até teste PASSAR              │
│  ↓                                                      │
│  COMMIT: Git commit automático com contexto             │
│  ↓                                                      │
│  Próxima subtask... (repete ciclo)                      │
└─────────────────────────────────────────────────────────┘
```

## Comandos

### Iniciar Workflow

```bash
# Inicia TDD para uma task (cria branch, entra em RED phase)
task-master autopilot start <taskId>

# Com limite de tentativas
task-master autopilot start <taskId> --max-attempts=3

# Forçar início (ignora verificações)
task-master autopilot start <taskId> --force
```

### Durante o Workflow

```bash
# Ver próxima ação necessária
task-master autopilot next

# Ver status completo (fase atual, progresso, subtask)
task-master autopilot status

# Completar fase atual com resultados dos testes
task-master autopilot complete --test-results='{"total":5,"passed":3,"failed":2,"skipped":0}'
```

### Commit

```bash
# Commit automático (gera mensagem baseada no contexto)
task-master autopilot commit

# Com mensagem customizada
task-master autopilot commit --custom-message="feat: implement validation"

# Arquivos específicos
task-master autopilot commit --files="src/file.ts,test/file.test.ts"
```

### Controle do Workflow

```bash
# Continuar workflow interrompido
task-master autopilot resume

# Abortar (mantém branch e código, limpa estado)
task-master autopilot abort
```

## Fluxo Típico

```bash
# 1. Expandir task em subtasks testáveis
task-master expand --id=3 --prompt="Break into TDD-friendly subtasks"

# 2. Iniciar autopilot
task-master autopilot start 3

# 3. Ver o que fazer (RED phase)
task-master autopilot next
# → "Write failing test for: Create Logger interface"

# 4. Escrever teste que falha, rodar testes
bun test

# 5. Reportar resultado (avança para GREEN)
task-master autopilot complete --test-results='{"total":1,"passed":0,"failed":1,"skipped":0}'

# 6. Ver próxima ação (GREEN phase)
task-master autopilot next
# → "Implement code to make test pass"

# 7. Implementar, rodar testes
bun test

# 8. Reportar resultado (avança para COMMIT)
task-master autopilot complete --test-results='{"total":1,"passed":1,"failed":0,"skipped":0}'

# 9. Commit automático
task-master autopilot commit

# 10. Próxima subtask (volta para RED)
task-master autopilot next
```

## Fases e Expectativas

| Fase | Expectativa | Se diferente |
|------|-------------|--------------|
| **RED** | Testes falham | Se passa: feature já existe, subtask auto-completa |
| **GREEN** | Testes passam | Se falha: continue implementando |
| **COMMIT** | Use `autopilot commit` | Auto-gera mensagem com contexto |

## Integração com Git

- **Branch automática**: `task-<id>-<slug>` criada no start
- **Commits semânticos**: Mensagens geradas com contexto da subtask
- **Working tree limpa**: Validada antes de finalizar

## Estado

Salvo em `.taskmaster/state.json` - fase atual, subtask ativa, histórico.
