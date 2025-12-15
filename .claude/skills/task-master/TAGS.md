# Tag Management

Tags permitem **isolamento de contexto** - tasks separadas por feature, sprint, ou branch.

## Conceito

```
.taskmaster/tasks/tasks.json
├── master (tag padrão)
│   ├── Task 1: Logger module
│   └── Task 2: Migrate demo.ts
├── feature-auth (tag isolada)
│   ├── Task 1: OAuth setup
│   └── Task 2: JWT handling
└── sprint-12 (outra tag)
    └── ...
```

## Comandos

### Listar Tags

```bash
# Ver todas as tags
task-master tags

# Com metadados (contagem de tasks, datas)
task-master tags --show-metadata
```

### Criar Tag

```bash
# Nova tag vazia
task-master add-tag feature-xyz

# Com descrição
task-master add-tag feature-xyz --description="Auth implementation"

# Copiar tasks de outra tag
task-master add-tag feature-xyz --copy-from=master

# Copiar da tag atual
task-master add-tag feature-xyz --copy-from-current
```

### Trocar de Tag

```bash
# Mudar contexto ativo
task-master use-tag feature-xyz

# Depois disso, todos os comandos operam nessa tag
task-master list  # → mostra tasks de feature-xyz
task-master next  # → próxima task de feature-xyz
```

### Gerenciar Tags

```bash
# Renomear
task-master rename-tag --old-name=feature-xyz --new-name=feature-auth

# Copiar tag inteira
task-master copy-tag --source=master --target=backup-master

# Deletar (CUIDADO: remove todas as tasks da tag)
task-master delete-tag feature-xyz

# Confirmar deleção
task-master delete-tag feature-xyz --yes
```

### Mover Tasks Entre Tags

```bash
# Mover task para outra tag
task-master move --from=1 --from-tag=feature-xyz --to-tag=master

# Mover com dependências
task-master move --from=1,2 --from-tag=feature-xyz --to-tag=master --with-dependencies

# Ignorar dependências
task-master move --from=1 --from-tag=feature-xyz --to-tag=master --ignore-dependencies
```

## Casos de Uso

### Feature Branch Workflow

```bash
# Criar tag para feature
task-master add-tag feature-auth --description="User authentication"
task-master use-tag feature-auth

# Adicionar tasks específicas
task-master add-task --prompt="Setup OAuth provider"
task-master add-task --prompt="Implement JWT handling"

# Trabalhar nas tasks...

# Quando feature completa, mover para master
task-master move --from=1,2 --from-tag=feature-auth --to-tag=master --with-dependencies
task-master delete-tag feature-auth --yes
```

### Sprint Planning

```bash
# Criar tag para sprint
task-master add-tag sprint-12 --copy-from=backlog

# Trabalhar no sprint
task-master use-tag sprint-12

# No fim do sprint, tasks não completas voltam
task-master move --from=3,4 --from-tag=sprint-12 --to-tag=backlog
```

## Tag Atual

Ver qual tag está ativa:
```bash
task-master tags
# → indica a tag atual com asterisco (*)
```
