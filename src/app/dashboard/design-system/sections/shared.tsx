'use client'

import { cn } from '@/lib/utils'

export function SectionWrapper({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      {children}
    </section>
  )
}

export function ShowcaseBox({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/50 bg-muted/20 p-6',
        className
      )}
    >
      {children}
    </div>
  )
}

export function TokenLabel({ name, variable }: { name: string; variable: string }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-medium truncate">{name}</p>
      <p className="text-[11px] text-muted-foreground font-mono truncate">
        {variable}
      </p>
    </div>
  )
}
