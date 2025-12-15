---
name: task-master
description: Manages project tasks via task-master-ai CLI. Use when user mentions tasks, next task, task status, expand task, task complexity, subtasks, or task management. For TDD workflow see AUTOPILOT.md. For tag management see TAGS.md.
---

# Task Master CLI

Task management via CLI. Auto-detects project root by finding `.taskmaster/` directory.

## Essential Commands

```bash
# Next task (based on dependencies & priority)
task-master next

# List all tasks
task-master list

# List with subtasks
task-master list --with-subtasks

# Filter by status
task-master list --status=pending

# Show specific task (use "1.2" for subtask 2 of task 1)
task-master show <id>
```

## Status Management

```bash
# Set status (positional args)
task-master set-status <id> <status>

# Examples
task-master set-status 1 in-progress
task-master set-status 1.2 done
```

**Statuses:** `pending`, `in-progress`, `done`, `review`, `deferred`, `cancelled`, `blocked`

## Expand Tasks

```bash
# Expand into subtasks (AI-powered)
task-master expand --id=<id>

# With specific count
task-master expand --id=<id> --num=5

# With context
task-master expand --id=<id> --prompt="Focus on error handling"

# Expand all pending
task-master expand --all
```

## Complexity Analysis

```bash
# Analyze all tasks (generates report)
task-master analyze-complexity

# With custom threshold (1-10)
task-master analyze-complexity --threshold=5

# View existing report
task-master complexity-report
```

## Add/Update Tasks

```bash
# Add task
task-master add-task --prompt="Description"

# With priority and dependencies
task-master add-task --prompt="Desc" --priority=high --dependencies=1,2

# Update task (positional - no quotes needed for multi-word)
task-master update-task <id> <prompt...>

# Update subtask
task-master update-subtask --id=<parentId.subtaskId> --prompt="<context>"

# Remove task
task-master remove-task --id=<id>
```

## Dependencies

```bash
# Add dependency
task-master add-dependency --id=<id> --depends-on=<dep-id>

# Remove dependency
task-master remove-dependency --id=<id> --depends-on=<dep-id>

# Validate (check circular refs)
task-master validate-dependencies

# Auto-fix
task-master fix-dependencies
```

## Additional References

- **TDD Workflow**: See [AUTOPILOT.md](AUTOPILOT.md) for RED → GREEN → COMMIT cycle
- **Tag Management**: See [TAGS.md](TAGS.md) for context isolation
- **Advanced Commands**: See [ADVANCED.md](ADVANCED.md) for move, research, PRD parsing

## Project Detection

CLI auto-finds `.taskmaster/` in current or parent directories.
Override with: `TASK_MASTER_PROJECT_ROOT=/path/to/project`
