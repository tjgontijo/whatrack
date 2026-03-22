'use client'

import { SectionWrapper, ShowcaseBox } from './shared'

const spacingScale = [
  { name: '1', px: '4px', tw: 'p-1 / gap-1' },
  { name: '2', px: '8px', tw: 'p-2 / gap-2' },
  { name: '3', px: '12px', tw: 'p-3 / gap-3' },
  { name: '4', px: '16px', tw: 'p-4 / gap-4' },
  { name: '6', px: '24px', tw: 'p-6 / gap-6' },
  { name: '8', px: '32px', tw: 'p-8 / gap-8' },
  { name: '12', px: '48px', tw: 'p-12 / gap-12' },
  { name: '16', px: '64px', tw: 'p-16 / gap-16' },
]

const patterns = [
  { context: 'Page shell', value: 'px-6 py-6', desc: 'Padding da área de conteúdo principal' },
  { context: 'Card (default)', value: 'py-6, px-6', desc: 'Padding interno de cards padrão' },
  { context: 'Card (sm)', value: 'py-4, px-4', desc: 'Padding interno de cards compactos' },
  { context: 'Toolbar', value: 'px-4 py-3', desc: 'Barras de ferramentas e filtros' },
  { context: 'Entre seções', value: 'gap-6', desc: 'Espaço entre blocos de conteúdo' },
  { context: 'Entre itens', value: 'gap-2 / gap-3', desc: 'Espaço entre elementos relacionados' },
  { context: 'Inline items', value: 'gap-1.5', desc: 'Ícone + texto, badge + label' },
]

export function SpacingSection() {
  return (
    <SectionWrapper
      id="espacamento"
      title="Espaçamento"
      description="Escala de espaçamento baseada no Tailwind. Use estes valores para manter ritmo visual consistente."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <ShowcaseBox>
          <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-widest">
            Escala
          </h3>
          <div className="space-y-3">
            {spacingScale.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-muted-foreground w-6 shrink-0 text-right font-mono text-xs">
                  {s.name}
                </span>
                <div
                  className="bg-primary/20 border-primary/30 h-5 rounded-md border"
                  style={{ width: s.px }}
                />
                <span className="text-muted-foreground text-xs">{s.px}</span>
                <span className="text-muted-foreground/60 hidden font-mono text-[11px] sm:inline">
                  {s.tw}
                </span>
              </div>
            ))}
          </div>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-widest">
            Padrões de uso
          </h3>
          <div className="space-y-3">
            {patterns.map((p) => (
              <div
                key={p.context}
                className="border-border/30 flex flex-col gap-0.5 border-b pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{p.context}</span>
                  <code className="text-primary bg-primary/5 shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px]">
                    {p.value}
                  </code>
                </div>
                <span className="text-muted-foreground text-xs">{p.desc}</span>
              </div>
            ))}
          </div>
        </ShowcaseBox>
      </div>
    </SectionWrapper>
  )
}
