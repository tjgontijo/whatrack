'use client'

import React, { useState } from 'react'
import { Puzzle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageShell, PageHeader, PageContent } from '@/components/dashboard/layout'
import { LoadingCard } from '@/components/dashboard/states'
import { SkillLibrary } from '@/components/dashboard/ai/skill-library'
import { SkillForm } from '@/components/dashboard/ai/skill-form'
import { useAiSkills } from '@/hooks/ai/use-ai-skills'

export default function AiSkillsPage() {
  const { data: skills = [], isLoading } = useAiSkills()
  const [formOpen, setFormOpen] = useState(false)

  return (
    <PageShell>
      <PageHeader
        title="Biblioteca de Skills"
        description="Blocos de instrução reutilizáveis para seus agentes de IA."
        icon={Puzzle}
        actions={
          <Button className="gap-2" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova Skill
          </Button>
        }
      />

      <PageContent>
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </div>
        )}

        {!isLoading && <SkillLibrary skills={skills} />}
      </PageContent>

      <SkillForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => setFormOpen(false)}
      />
    </PageShell>
  )
}
