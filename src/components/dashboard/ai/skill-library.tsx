'use client'

import React, { useState } from 'react'
import { Lock, Puzzle, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteConfirmDialog } from '@/components/dashboard/crud/delete-confirm-dialog'
import { SkillForm } from '@/components/dashboard/ai/skill-form'
import { useDeleteAiSkill } from '@/hooks/ai/use-ai-skills'
import type { AiSkill } from '@/types/ai/ai-skill'

// ---------- SkillCard ----------

interface SkillCardProps {
  skill: AiSkill
  onEdit: () => void
  onDeleted: () => void
}

function SkillCard({ skill, onEdit, onDeleted }: SkillCardProps) {
  const isSystem = skill.source === 'SYSTEM'
  const deleteMutation = useDeleteAiSkill()

  async function handleDelete() {
    await deleteMutation.mutateAsync(skill.id)
    toast.success(`Skill "${skill.name}" removida e desvinculada dos agentes.`)
    onDeleted()
  }

  return (
    <Card className={isSystem ? 'border-dashed' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {isSystem ? (
              <Lock className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <Puzzle className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{skill.name}</CardTitle>
              <p className="text-muted-foreground truncate text-[10px]">{skill.slug}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Badge variant="outline" className="text-[10px] uppercase">
              {skill.kind === 'SHARED' ? 'Compartilhada' : 'De Agente'}
            </Badge>
            {isSystem && (
              <Badge variant="secondary" className="text-[10px]">
                Sistema
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-0 pb-3">
        {skill.description && (
          <p className="text-muted-foreground mb-2 text-xs">{skill.description}</p>
        )}
        <p className="text-muted-foreground line-clamp-3 font-mono text-xs leading-relaxed">
          {skill.content}
        </p>
      </CardContent>

      {!isSystem && (
        <CardFooter className="flex items-center justify-between gap-2 border-t pt-3">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onEdit}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Editar
          </Button>

          <DeleteConfirmDialog
            title={`Apagar skill "${skill.name}"?`}
            description="Esta skill será removida de todos os agentes vinculados. Essa ação não pode ser desfeita."
            confirmText="Apagar Skill"
            isLoading={deleteMutation.isPending}
            onConfirm={handleDelete}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-1"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                )}
                Apagar
              </Button>
            }
          />
        </CardFooter>
      )}
    </Card>
  )
}

// ---------- NewSkillCard ----------

function NewSkillCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30 flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed transition-colors"
    >
      <Plus className="text-muted-foreground h-5 w-5" />
      <span className="text-muted-foreground text-sm">Nova Skill</span>
    </button>
  )
}

// ---------- SectionHeader ----------

function SectionHeader({
  icon: Icon,
  label,
  count,
}: {
  icon: React.ElementType
  label: string
  count: number
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="text-muted-foreground h-3.5 w-3.5" />
      <span className="text-muted-foreground text-sm font-medium">{label}</span>
      <Badge variant="secondary" className="text-xs">
        {count}
      </Badge>
    </div>
  )
}

// ---------- SkillLibrary ----------

interface SkillLibraryProps {
  skills: AiSkill[]
}

export function SkillLibrary({ skills }: SkillLibraryProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<AiSkill | null>(null)

  const systemSkills = skills.filter((s) => s.source === 'SYSTEM')
  const customSkills = skills.filter((s) => s.source === 'CUSTOM')

  function openCreate() {
    setEditingSkill(null)
    setFormOpen(true)
  }

  function openEdit(skill: AiSkill) {
    setEditingSkill(skill)
    setFormOpen(true)
  }

  return (
    <>
      <SkillForm
        open={formOpen}
        onOpenChange={setFormOpen}
        skill={editingSkill}
        onSuccess={() => setFormOpen(false)}
      />

      <div className="space-y-10">
        {systemSkills.length > 0 && (
          <section>
            <SectionHeader icon={Lock} label="Do Sistema" count={systemSkills.length} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {systemSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onEdit={() => openEdit(skill)}
                  onDeleted={() => {}}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Puzzle className="text-primary h-3.5 w-3.5" />
              <span className="text-sm font-medium">Personalizadas</span>
              <Badge variant="secondary" className="text-xs">
                {customSkills.length}
              </Badge>
            </div>
            {customSkills.length > 0 && (
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Nova Skill
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onEdit={() => openEdit(skill)}
                onDeleted={() => {}}
              />
            ))}
            <NewSkillCard onClick={openCreate} />
          </div>
        </section>
      </div>
    </>
  )
}
