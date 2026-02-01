'use client'

import * as React from 'react'
import { Check, ChevronDown, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface FilterPillProps {
    label: string
    value?: string
    icon?: LucideIcon
    active?: boolean
    className?: string
}

export function FilterPill({ label, value, icon: Icon, active, className }: FilterPillProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        'h-7 rounded-full border px-2 text-xs font-medium transition-colors hover:bg-muted/50 data-[state=open]:bg-muted/50',
                        active
                            ? 'border-transparent bg-primary/10 text-primary hover:bg-primary/15'
                            : 'border-dashed border-border text-muted-foreground',
                        className
                    )}
                >
                    {Icon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
                    <span>{label}</span>
                    {value && (
                        <>
                            <span className="mx-1.5 h-3 w-[1px] bg-border/50" />
                            <span className={cn(active ? 'text-primary' : 'text-foreground')}>{value}</span>
                        </>
                    )}
                    <ChevronDown className="ml-1.5 h-3 w-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            {/* Empty Content for Demo - Step 2 Focus is UI */}
            <DropdownMenuContent align="start" className="w-[200px]">
                <DropdownMenuItem>
                    <Check className="mr-2 h-4 w-4 opacity-100" />
                    Opção Mock
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
