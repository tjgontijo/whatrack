'use client'

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Lock,
  Layers,
  Plus,
  X,
  ExternalLink,
  Puzzle,
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useUpdateAgentSkillBindings } from '@/hooks/ai/use-agent-skill-bindings'
import { useRequiredProjectPath } from '@/hooks/project/project-route-context'
import type { AiSkill } from '@/types/ai/ai-skill'
import type { FormSkillBinding } from '@/types/ai/ai-agent-skill'

// ---------- SortableCustomRow ----------

interface SortableCustomRowProps {
  binding: FormSkillBinding
  onToggle: (skillId: string, isActive: boolean) => void
  onRemove: (skillId: string) => void
}

function SortableCustomRow({ binding, onToggle, onRemove }: SortableCustomRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: binding.skillId,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card flex items-center gap-3 rounded-md border px-3 py-2.5 shadow-sm"
    >
      <button
        className="text-muted-foreground cursor-grab touch-none active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Puzzle className="text-primary h-3.5 w-3.5 shrink-0" />

      <span className="flex-1 truncate text-sm font-medium">{binding.skill.name}</span>

      <Badge variant="outline" className="text-[10px] uppercase">
        {binding.skill.kind === 'SHARED' ? 'Compartilhada' : 'De Agente'}
      </Badge>

      <Switch
        checked={binding.isActive}
        onCheckedChange={(v) => onToggle(binding.skillId, v)}
        className="h-4 w-7"
      />

      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive h-6 w-6"
        onClick={() => onRemove(binding.skillId)}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

// ---------- SystemRow ----------

interface SystemRowProps {
  binding: FormSkillBinding
  onToggle: (skillId: string, isActive: boolean) => void
}

function SystemRow({ binding, onToggle }: SystemRowProps) {
  return (
    <div className="bg-muted/30 flex items-center gap-3 rounded-md border border-dashed px-3 py-2.5">
      <Lock className="text-muted-foreground h-3.5 w-3.5 shrink-0" />

      <span className="flex-1 truncate text-sm font-medium">{binding.skill.name}</span>

      <Badge variant="secondary" className="text-[10px]">
        Sistema
      </Badge>

      <Switch
        checked={binding.isActive}
        onCheckedChange={(v) => onToggle(binding.skillId, v)}
        className="h-4 w-7"
      />

      {/* spacer to align with custom rows that have remove button */}
      <div className="w-6" />
    </div>
  )
}

// ---------- LeftPanelItem ----------

interface LeftPanelItemProps {
  skill: AiSkill
  isAlreadyBound: boolean
  onAdd: (skill: AiSkill) => void
}

function LeftPanelItem({ skill, isAlreadyBound, onAdd }: LeftPanelItemProps) {
  const isSystem = skill.source === 'SYSTEM'

  return (
    <div className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50">
      {isSystem ? (
        <Lock className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
      ) : (
        <Puzzle className="text-primary h-3.5 w-3.5 shrink-0" />
      )}

      <span
        className={`flex-1 truncate text-sm ${isAlreadyBound || isSystem ? 'text-muted-foreground' : ''}`}
      >
        {skill.name}
      </span>

      <Badge variant="outline" className="text-[10px] uppercase">
        {skill.kind === 'SHARED' ? 'Compartilhada' : 'De Agente'}
      </Badge>

      {!isSystem && !isAlreadyBound && (
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => onAdd(skill)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      )}

      {!isSystem && isAlreadyBound && <div className="w-6" />}
    </div>
  )
}

// ---------- AgentSkillBindings ----------

interface AgentSkillBindingsProps {
  allSkills: AiSkill[]
  value: FormSkillBinding[]
  onChange: (bindings: FormSkillBinding[]) => void
  /** Quando presente (modo edição), salva sortOrder automaticamente após cada reordenação. */
  agentId?: string
}

export function AgentSkillBindings({ allSkills, value, onChange, agentId }: AgentSkillBindingsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )
  const autoSave = useUpdateAgentSkillBindings(agentId ?? '')
  const aiSkillsPath = useRequiredProjectPath('/settings/ai/skills')

  const systemBindings = value.filter((b) => b.skill.source === 'SYSTEM')
  const customBindings = value.filter((b) => b.skill.source === 'CUSTOM')
  const boundIds = new Set(value.map((b) => b.skillId))

  const systemSkills = allSkills.filter((s) => s.source === 'SYSTEM')
  const customSkills = allSkills.filter((s) => s.source === 'CUSTOM')

  function handleToggle(skillId: string, isActive: boolean) {
    onChange(value.map((b) => (b.skillId === skillId ? { ...b, isActive } : b)))
  }

  function handleAdd(skill: AiSkill) {
    const maxOrder = customBindings.reduce((max, b) => Math.max(max, b.sortOrder), 90)
    const newBinding: FormSkillBinding = {
      skillId: skill.id,
      sortOrder: maxOrder + 10,
      isActive: true,
      skill: { id: skill.id, slug: skill.slug, name: skill.name, kind: skill.kind, source: skill.source, isActive: skill.isActive },
    }
    onChange([...value, newBinding])
  }

  function handleRemove(skillId: string) {
    onChange(value.filter((b) => b.skillId !== skillId))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = customBindings.findIndex((b) => b.skillId === active.id)
    const newIndex = customBindings.findIndex((b) => b.skillId === over.id)
    const reordered = arrayMove(customBindings, oldIndex, newIndex).map((b, i) => ({
      ...b,
      sortOrder: 100 + i * 10,
    }))

    const next = [...systemBindings, ...reordered]
    onChange(next)

    if (agentId) {
      autoSave.mutate(
        next.map(({ skillId, sortOrder, isActive }) => ({ skillId, sortOrder, isActive })),
      )
    }
  }

  return (
    <div className="grid grid-cols-5 divide-x">
      {/* Left panel: library */}
      <div className="col-span-2 flex flex-col p-4">
        <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
          Biblioteca de Skills
        </p>

        <div className="max-h-64 flex-1 overflow-y-auto space-y-0.5">
          {systemSkills.length > 0 && (
            <>
              <p className="text-muted-foreground px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide">
                Do Sistema
              </p>
              {systemSkills.map((skill) => (
                <LeftPanelItem
                  key={skill.id}
                  skill={skill}
                  isAlreadyBound={boundIds.has(skill.id)}
                  onAdd={handleAdd}
                />
              ))}
            </>
          )}

          {customSkills.length > 0 && (
            <>
              <p className="text-muted-foreground px-2 pb-1 pt-3 text-[10px] font-medium uppercase tracking-wide">
                Personalizadas
              </p>
              {customSkills.map((skill) => (
                <LeftPanelItem
                  key={skill.id}
                  skill={skill}
                  isAlreadyBound={boundIds.has(skill.id)}
                  onAdd={handleAdd}
                />
              ))}
            </>
          )}

          {customSkills.length === 0 && systemSkills.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-xs">
              Nenhuma skill disponível.
            </p>
          )}
        </div>

        <Separator className="my-3" />

        <Button variant="ghost" size="sm" className="w-full border border-dashed text-xs" asChild>
          <Link href={aiSkillsPath}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Criar nova skill
          </Link>
        </Button>
      </div>

      {/* Right panel: active bindings */}
      <div className="col-span-3 flex flex-col p-4">
        <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
          Execução neste agente
        </p>
        <p className="text-muted-foreground mb-3 text-[10px]">
          Ordem de composição — a skill 1 executa primeiro
        </p>

        {systemBindings.length === 0 && customBindings.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-dashed py-8 text-center">
            <Layers className="text-muted-foreground mb-2 h-6 w-6" />
            <p className="text-muted-foreground text-sm">Nenhuma skill ativa.</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              O agente vai rodar apenas com o Prompt Enxuto.
            </p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {systemBindings.map((binding) => (
              <SystemRow key={binding.skillId} binding={binding} onToggle={handleToggle} />
            ))}

            {systemBindings.length > 0 && customBindings.length > 0 && (
              <Separator className="my-1" />
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={customBindings.map((b) => b.skillId)}
                strategy={verticalListSortingStrategy}
              >
                {customBindings.map((binding) => (
                  <SortableCustomRow
                    key={binding.skillId}
                    binding={binding}
                    onToggle={handleToggle}
                    onRemove={handleRemove}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        <div className="mt-3 flex items-center justify-end">
          <Button variant="link" size="sm" className="text-muted-foreground h-auto p-0 text-xs" asChild>
            <Link href={aiSkillsPath}>
              Gerenciar biblioteca de skills
              <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
