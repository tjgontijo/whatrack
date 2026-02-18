'use client'

import { SectionWrapper, ShowcaseBox, TokenLabel } from './shared'

const groups = [
  {
    title: 'Base',
    tokens: [
      { name: 'Background', variable: '--background', color: 'var(--background)' },
      { name: 'Foreground', variable: '--foreground', color: 'var(--foreground)' },
      { name: 'Card', variable: '--card', color: 'var(--card)' },
      { name: 'Popover', variable: '--popover', color: 'var(--popover)' },
    ],
  },
  {
    title: 'Brand',
    tokens: [
      { name: 'Primary', variable: '--primary', color: 'var(--primary)' },
      { name: 'Primary FG', variable: '--primary-foreground', color: 'var(--primary-foreground)' },
      { name: 'Secondary', variable: '--secondary', color: 'var(--secondary)' },
      { name: 'Accent', variable: '--accent', color: 'var(--accent)' },
    ],
  },
  {
    title: 'Semânticas',
    tokens: [
      { name: 'Success', variable: '--success', color: 'var(--success)' },
      { name: 'Warning', variable: '--warning', color: 'var(--warning)' },
      { name: 'Info', variable: '--info', color: 'var(--info)' },
      { name: 'Destructive', variable: '--destructive', color: 'var(--destructive)' },
    ],
  },
  {
    title: 'UI',
    tokens: [
      { name: 'Muted', variable: '--muted', color: 'var(--muted)' },
      { name: 'Muted FG', variable: '--muted-foreground', color: 'var(--muted-foreground)' },
      { name: 'Border', variable: '--border', color: 'var(--border)' },
      { name: 'Input', variable: '--input', color: 'var(--input)' },
      { name: 'Ring', variable: '--ring', color: 'var(--ring)' },
    ],
  },
  {
    title: 'Charts',
    tokens: [
      { name: 'Chart 1', variable: '--chart-1', color: 'var(--chart-1)' },
      { name: 'Chart 2', variable: '--chart-2', color: 'var(--chart-2)' },
      { name: 'Chart 3', variable: '--chart-3', color: 'var(--chart-3)' },
      { name: 'Chart 4', variable: '--chart-4', color: 'var(--chart-4)' },
      { name: 'Chart 5', variable: '--chart-5', color: 'var(--chart-5)' },
    ],
  },
]

export function ColorsSection() {
  return (
    <SectionWrapper
      id="cores"
      title="Cores"
      description="Paleta de cores do sistema definida via CSS custom properties com OkLCh. Use sempre os tokens — nunca cores hard-coded como text-blue-600."
    >
      <div className="space-y-8">
        {groups.map((group) => (
          <div key={group.title}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              {group.title}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {group.tokens.map((token) => (
                <div
                  key={token.variable}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3"
                >
                  <div
                    className="size-10 rounded-lg shrink-0 border border-border/30"
                    style={{ backgroundColor: token.color }}
                  />
                  <TokenLabel name={token.name} variable={token.variable} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  )
}
