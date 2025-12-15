# Advanced Commands

Comandos menos frequentes: move, research, PRD parsing, configuração.

## Move Tasks

```bash
# Mover task para nova posição
task-master move --from=5 --to=2

# Mover múltiplas (quantidade deve ser igual)
task-master move --from=1,2,3 --to=4,5,6

# Converter subtask em task standalone
task-master move --from=1.2 --to=5

# Converter task em subtask
task-master move --from=5 --to=1.3

# Mover subtask para outro parent
task-master move --from=1.2 --to=2
```

## Research

Pesquisa com AI usando contexto do projeto:

```bash
# Pesquisar tópico
task-master research "Best practices for structured logging"

# Salvar resultado em task específica
task-master research "How to implement orphan cleanup" --id=4

# Salvar em arquivo
task-master research "Sentry vs Axiom comparison" --save-to-file

# Nível de detalhe (high/medium/low)
task-master research "Query" --detail-level=high

# Incluir estrutura do projeto no contexto
task-master research "Query" --include-project-tree
```

## PRD Parsing

Gerar tasks a partir de documento de requisitos:

```bash
# Parsear PRD
task-master parse-prd /path/to/prd.txt

# Limitar número de tasks
task-master parse-prd prd.txt --num-tasks=10

# Com research (mais detalhado)
task-master parse-prd prd.txt --research

# Output customizado
task-master parse-prd prd.txt --output=custom-tasks.json
```

## Generate Files

Gerar arquivos markdown individuais para cada task:

```bash
# Gerar em tasks/
task-master generate

# Diretório customizado
task-master generate --output=docs/tasks/
```

## Configuration

### Models

```bash
# Ver configuração atual
task-master models

# Setup interativo
task-master models --setup

# Configurar diretamente
task-master models --set-main=claude-3-5-sonnet
task-master models --set-research=perplexity/sonar-pro
task-master models --set-fallback=claude-3-haiku
```

### Rules (Editor Integration)

```bash
# Adicionar regras de editor
task-master rules add cursor,vscode

# Remover regras
task-master rules remove cursor
```

### Initialize Project

```bash
# Inicializar novo projeto
task-master init

# Com regras específicas
task-master init --rules cursor,windsurf,vscode
```

## Clear Subtasks

```bash
# Limpar subtasks de uma task
task-master clear-subtasks --id=3

# Limpar de múltiplas
task-master clear-subtasks --id=1,2,3

# Limpar todas
task-master clear-subtasks --all
```

## Environment Variables

```bash
# Override project root
TASK_MASTER_PROJECT_ROOT=/path/to/project

# Tool loading mode
TASK_MASTER_TOOLS=core  # core | standard | all
```

## Tool Loading Modes

| Mode | Tools | Use Case |
|------|-------|----------|
| `core` | 7 | Minimal - list, next, status |
| `standard` | 15 | Typical - + expand, add, analyze |
| `all` | 36 | Complete - everything |
