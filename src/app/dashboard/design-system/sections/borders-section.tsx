'use client'

import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { SectionWrapper, ShowcaseBox } from './shared'

const radii = [
  { name: 'sm', tw: 'rounded-sm' },
  { name: 'md', tw: 'rounded-md' },
  { name: 'lg', tw: 'rounded-lg' },
  { name: 'xl', tw: 'rounded-xl' },
  { name: '2xl', tw: 'rounded-2xl' },
  { name: '3xl', tw: 'rounded-3xl' },
  { name: '4xl', tw: 'rounded-4xl' },
]

const shadows = [
  { name: 'shadow-sm', tw: 'shadow-sm', usage: 'Elevação sutil — segmented controls, dropdowns' },
  { name: 'shadow-md', tw: 'shadow-md', usage: 'Cards com hover, popovers' },
  { name: 'shadow-lg', tw: 'shadow-lg', usage: 'Dialogs, sheets, drawers' },
  { name: 'shadow-xl', tw: 'shadow-xl', usage: 'FAB, elementos flutuantes' },
]

export function BordersSection() {
  return (
    <SectionWrapper
      id="bordas"
      title="Bordas, Sombras & Radius"
      description="Valores padronizados de border-radius, estilos de borda e sombras. O radius base é 0.625rem."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <ShowcaseBox>
          <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-widest">
            Border Radius
          </h3>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
            {radii.map((r) => (
              <div key={r.name} className="flex flex-col items-center gap-2">
                <div className={cn('border-primary/40 bg-primary/5 size-16 border-2', r.tw)} />
                <span className="text-muted-foreground font-mono text-[11px]">{r.name}</span>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-widest">
            Estilos de Borda
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="border-border rounded-xl border p-4">
              <p className="text-sm font-medium">border-border</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Padrão — cards, separadores, inputs
              </p>
            </div>
            <div className="border-border/50 rounded-xl border p-4">
              <p className="text-sm font-medium">border-border/50</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Sutil — cards de listagem, divisores leves
              </p>
            </div>
          </div>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-widest">
            Sombras
          </h3>
          <div className="space-y-4">
            {shadows.map((s) => (
              <div key={s.name} className="flex items-center gap-4">
                <div
                  className={cn(
                    'bg-card border-border/30 size-16 shrink-0 rounded-xl border',
                    s.tw
                  )}
                />
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium">{s.name}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">{s.usage}</p>
                </div>
              </div>
            ))}
          </div>
        </ShowcaseBox>
      </div>
    </SectionWrapper>
  )
}
