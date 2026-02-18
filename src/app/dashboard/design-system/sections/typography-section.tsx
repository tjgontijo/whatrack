'use client'

import { Badge } from '@/components/ui/badge'
import { SectionWrapper, ShowcaseBox } from './shared'

const scale = [
  {
    name: 'H1',
    classes: 'text-3xl font-bold tracking-tight',
    text: 'Título Principal',
    usage: 'Cabeçalho de página',
  },
  {
    name: 'H2',
    classes: 'text-2xl font-semibold tracking-tight',
    text: 'Título de Seção',
    usage: 'Seções dentro de uma página',
  },
  {
    name: 'H3',
    classes: 'text-lg font-semibold',
    text: 'Título de Card',
    usage: 'Títulos de cards e dialogs',
  },
  {
    name: 'H4',
    classes: 'text-base font-medium',
    text: 'Subtítulo',
    usage: 'Subtítulos e labels importantes',
  },
  {
    name: 'Body',
    classes: 'text-sm',
    text: 'Corpo de texto padrão do sistema. Usado na maioria dos conteúdos e interfaces.',
    usage: 'Texto principal de conteúdo',
  },
  {
    name: 'Caption',
    classes: 'text-xs text-muted-foreground',
    text: 'Texto auxiliar e secundário',
    usage: 'Metadados, timestamps, dicas',
  },
  {
    name: 'Overline',
    classes: 'text-[11px] font-semibold uppercase tracking-widest text-muted-foreground',
    text: 'LABEL AUXILIAR',
    usage: 'Labels de seção, contadores',
  },
  {
    name: 'Code',
    classes: 'font-mono text-sm',
    text: 'const x = 42',
    usage: 'Código, variáveis, valores técnicos',
  },
]

export function TypographySection() {
  return (
    <SectionWrapper
      id="tipografia"
      title="Tipografia"
      description="Escala tipográfica usando Geist Sans (texto) e Geist Mono (código). Seguir esta hierarquia garante consistência visual em todas as telas."
    >
      <ShowcaseBox>
        <div className="space-y-6">
          {scale.map((item) => (
            <div
              key={item.name}
              className="flex flex-col gap-1 pb-6 border-b border-border/30 last:border-0 last:pb-0"
            >
              <div className="flex items-baseline gap-3 mb-1">
                <Badge variant="outline" className="shrink-0 font-mono">
                  {item.name}
                </Badge>
                <span className="text-[11px] text-muted-foreground font-mono truncate">
                  {item.classes}
                </span>
              </div>
              <p className={item.classes}>{item.text}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Uso: {item.usage}
              </p>
            </div>
          ))}
        </div>
      </ShowcaseBox>
    </SectionWrapper>
  )
}
