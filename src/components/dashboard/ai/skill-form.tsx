'use client'

import React, { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateAiSkill, useUpdateAiSkill } from '@/hooks/ai/use-ai-skills'
import type { AiSkill } from '@/types/ai/ai-skill'

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
}

interface SkillFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  skill?: AiSkill | null
  onSuccess?: (skill: AiSkill) => void
}

export function SkillForm({ open, onOpenChange, skill, onSuccess }: SkillFormProps) {
  const isEditing = Boolean(skill)

  const [name, setName] = useState(skill?.name ?? '')
  const [slug, setSlug] = useState(skill?.slug ?? '')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [description, setDescription] = useState(skill?.description ?? '')
  const [kind, setKind] = useState<'SHARED' | 'AGENT'>(skill?.kind ?? 'SHARED')
  const [content, setContent] = useState(skill?.content ?? '')

  const createMutation = useCreateAiSkill()
  const updateMutation = useUpdateAiSkill()
  const isSaving = createMutation.isPending || updateMutation.isPending

  function handleNameChange(value: string) {
    setName(value)
    if (!slugManuallyEdited) {
      setSlug(toSlug(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true)
    setSlug(value.replace(/[^a-z0-9-]/g, ''))
  }

  function handleClose() {
    onOpenChange(false)
  }

  async function handleSubmit() {
    if (!name.trim() || !slug.trim() || !content.trim()) return

    if (isEditing && skill) {
      const result = await updateMutation.mutateAsync({
        id: skill.id,
        input: { name, slug, description: description || undefined, content, kind },
      })
      onSuccess?.(result)
      handleClose()
    } else {
      const result = await createMutation.mutateAsync({
        name,
        slug,
        description: description || undefined,
        content,
        kind,
      })
      onSuccess?.(result)
      handleClose()
    }
  }

  const slugInvalid = slug.length > 0 && !/^[a-z0-9-]+$/.test(slug)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Skill' : 'Nova Skill'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize o bloco de instrução desta skill.'
              : 'Crie um bloco de instrução reutilizável para seus agentes.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Ex: Calibração de Tom de Voz"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Slug <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="calibracao-tom-de-voz"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              disabled={isSaving}
              className={slugInvalid ? 'border-destructive' : ''}
            />
            {slugInvalid ? (
              <p className="text-destructive text-xs">
                Apenas letras minúsculas, números e hífens.
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Identificador único. Gerado automaticamente do nome.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as 'SHARED' | 'AGENT')}
              disabled={isSaving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SHARED">
                  <div>
                    <span className="font-medium">Compartilhada</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      — usável em qualquer agente
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="AGENT">
                  <div>
                    <span className="font-medium">De Agente</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      — instrução específica de um agente
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input
              placeholder="Descreva o objetivo desta skill (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>
                Instrução <span className="text-destructive">*</span>
              </Label>
              <span className="text-muted-foreground text-xs">{content.length} caracteres</span>
            </div>
            <Textarea
              className="min-h-[140px] resize-none font-mono text-sm leading-relaxed"
              placeholder="Escreva a instrução exatamente como será enviada ao LLM. Seja objetivo e imperativo."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSaving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !name.trim() || !slug.trim() || !content.trim() || slugInvalid}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Skill'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
