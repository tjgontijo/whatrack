'use client'

import { type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'

import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils/utils'

type SectionTabsListProps = React.ComponentProps<typeof TabsList>

export function SectionTabsList({ className, ...props }: SectionTabsListProps) {
  return (
    <TabsList
      variant="line"
      className={cn(
        'flex h-auto w-full items-center justify-start gap-1 border-none bg-transparent p-0 shadow-none',
        className
      )}
      {...props}
    />
  )
}

type SectionTabsTriggerProps = React.ComponentProps<typeof TabsTrigger> & {
  icon?: LucideIcon
  children: ReactNode
}

export function SectionTabsTrigger({
  className,
  icon: Icon,
  children,
  ...props
}: SectionTabsTriggerProps) {
  return (
    <TabsTrigger
      className={cn(
        'ring-offset-background focus-visible:ring-ring text-muted-foreground hover:bg-muted/50 hover:text-foreground data-[state=active]:text-foreground group relative flex flex-none items-center gap-2 rounded-none border-none bg-transparent px-3 py-2 text-xs font-medium shadow-none outline-none transition-colors after:hidden focus-visible:ring-2 focus-visible:ring-offset-2 data-[state=active]:bg-transparent',
        className
      )}
      {...props}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      <span>{children}</span>
      <span className="group-data-[state=active]:bg-primary absolute inset-x-0 -bottom-[1px] h-[2px] bg-transparent transition-colors group-data-[state=active]:shadow-[0_0_8px_0_var(--color-primary)]" />
      <span className="group-hover:group-data-[state=inactive]:bg-muted-foreground/20 absolute inset-x-0 -bottom-[1px] h-[2px] bg-transparent transition-colors" />
    </TabsTrigger>
  )
}
