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
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Border Radius
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {radii.map((r) => (
              <div key={r.name} className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'size-16 border-2 border-primary/40 bg-primary/5',
                    r.tw
                  )}
                />
                <span className="text-[11px] font-mono text-muted-foreground">
                  {r.name}
                </span>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Estilos de Borda
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-4">
              <p className="text-sm font-medium">border-border</p>
              <p className="text-xs text-muted-foreground mt-1">
                Padrão — cards, separadores, inputs
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-medium">border-border/50</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sutil — cards de listagem, divisores leves
              </p>
            </div>
          </div>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Sombras
          </h3>
          <div className="space-y-4">
            {shadows.map((s) => (
              <div key={s.name} className="flex items-center gap-4">
                <div
                  className={cn(
                    'size-16 shrink-0 rounded-xl bg-card border border-border/30',
                    s.tw
                  )}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium font-mono">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.usage}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ShowcaseBox>
      </div>
    </SectionWrapper>
  )
}
