'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Palette,
  Type,
  Space,
  Square,
  LayoutDashboard,
  PanelsTopLeft,
  Navigation,
  TableProperties,
  FormInput,
  Bell,
  Kanban,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

import { ColorsSection } from './sections/colors-section'
import { TypographySection } from './sections/typography-section'
import { SpacingSection } from './sections/spacing-section'
import { BordersSection } from './sections/borders-section'
import { CardsSection } from './sections/cards-section'
import { ShellsSection } from './sections/shells-section'
import { NavigationSection } from './sections/navigation-section'
import { TablesSection } from './sections/tables-section'
import { KanbanSection } from './sections/kanban-section'
import { FormsSection } from './sections/forms-section'
import { FeedbackSection } from './sections/feedback-section'

const sections = [
  { id: 'cores', label: 'Cores', icon: Palette },
  { id: 'tipografia', label: 'Tipografia', icon: Type },
  { id: 'espacamento', label: 'Espaçamento', icon: Space },
  { id: 'bordas', label: 'Bordas & Sombras', icon: Square },
  { id: 'cards', label: 'Cards', icon: LayoutDashboard },
  { id: 'shells', label: 'Page Shells', icon: PanelsTopLeft },
  { id: 'navegacao', label: 'Tabs & Navegação', icon: Navigation },
  { id: 'tabelas', label: 'Listas & Tabelas', icon: TableProperties },
  { id: 'kanban', label: 'Kanban', icon: Kanban },
  { id: 'formularios', label: 'Formulários', icon: FormInput },
  { id: 'feedback', label: 'Feedback', icon: Bell },
]

export function DesignSystemContent() {
  const [activeSection, setActiveSection] = useState('cores')
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )

    for (const section of sections) {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [])

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar Navigation — desktop */}
      <nav className="border-border/50 bg-background hidden w-56 shrink-0 flex-col overflow-y-auto border-r px-3 py-6 lg:flex">
        <div className="mb-6 px-3">
          <h1 className="text-lg font-bold tracking-tight">Design System</h1>
          <p className="text-muted-foreground mt-0.5 text-xs">Referência visual</p>
        </div>
        <div className="space-y-0.5">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Icon className="size-4 shrink-0" />
                {section.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="border-border bg-background/95 fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-sm lg:hidden">
        <div className="scrollbar-hide flex gap-1 overflow-x-auto px-2 py-2">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className={cn(
                  'flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors',
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="size-3.5" />
                {section.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-20 lg:pb-8">
        <div className="mx-auto max-w-4xl space-y-16 px-6 py-8">
          <ColorsSection />
          <Separator />
          <TypographySection />
          <Separator />
          <SpacingSection />
          <Separator />
          <BordersSection />
          <Separator />
          <CardsSection />
          <Separator />
          <ShellsSection />
          <Separator />
          <NavigationSection />
          <Separator />
          <TablesSection />
          <Separator />
          <KanbanSection />
          <Separator />
          <FormsSection />
          <Separator />
          <FeedbackSection />
        </div>
      </main>
    </div>
  )
}
