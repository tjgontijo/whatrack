'use client'

import React from 'react'
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { ViewSwitcher } from './view-switcher'
import { CrudDataView } from './crud-data-view'
import { ViewType } from './types'
import { Filter } from 'lucide-react'
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
    DrawerFooter,
    DrawerClose,
} from '@/components/ui/drawer'

interface CrudPageShellProps {
    title: string
    subtitle: string
    icon: React.ElementType
    onAdd?: () => void
    addLabel?: string

    // Search & View
    view: ViewType
    setView: (view: ViewType) => void
    enabledViews?: ViewType[]
    searchInput: string
    onSearchChange: (value: string) => void
    searchPlaceholder?: string

    // Pagination
    page: number
    limit: number
    onPageChange: (page: number) => void
    onLimitChange: (limit: number) => void
    totalItems: number
    totalPages: number
    hasMore: boolean

    // Filters & Actions
    filters?: React.ReactNode
    actions?: React.ReactNode
    children: React.ReactNode

    isLoading?: boolean
}

export function CrudPageShell({
    title,
    subtitle,
    icon: Icon,
    onAdd,
    addLabel = 'Novo',
    view,
    setView,
    enabledViews,
    searchInput,
    onSearchChange,
    searchPlaceholder = 'Buscar...',
    page,
    limit,
    onPageChange,
    onLimitChange,
    totalItems,
    totalPages,
    hasMore,
    filters,
    actions,
    children,
    isLoading
}: CrudPageShellProps) {
    const isMobile = useIsMobile()

    // Auto-switch to cards view on mobile/tablet
    React.useEffect(() => {
        if (isMobile && view === 'list') {
            setView('cards')
        }
    }, [isMobile, view, setView])

    return (
        <section className="flex flex-col h-full overflow-hidden bg-background">
            {!isMobile && (
                <>
                    {/* Synchronized Header */}
                    <div className="flex flex-col border-b border-border bg-background mt-6">
                        <div className="flex flex-col gap-2 px-6 py-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-3">
                                {Icon && (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
                                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {actions}
                            </div>
                        </div>
                        {/* View Switcher integrated in header container */}
                        <div className="px-6 pb-2">
                            <ViewSwitcher view={view} setView={setView} enabledViews={enabledViews} className="-ml-3" />
                        </div>
                    </div>

                    {/* Synchronized Toolbar */}
                    <div className="flex flex-col gap-4 py-3 md:flex-row md:items-center md:justify-between px-6 border-b border-border/50 bg-muted/5">
                        <div className="flex flex-1 items-center gap-2 overflow-x-auto">
                            <div className="relative w-full max-w-[320px]">
                                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder={searchPlaceholder}
                                    className="h-8 rounded-md border-border bg-background pl-9 text-xs focus-visible:ring-1 focus-visible:ring-ring transition-all"
                                    value={searchInput}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                />
                            </div>
                            {filters && (
                                <>
                                    <div className="h-4 w-[1px] bg-border mx-2" />
                                    {filters}
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}

            {isMobile && (
                <div className="flex flex-col gap-3 p-4 border-b bg-background">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold">{title}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder={searchPlaceholder}
                                className="h-10 rounded-full border-border bg-muted/50 pl-10 pr-4"
                                value={searchInput}
                                onChange={(e) => onSearchChange(e.target.value)}
                            />
                        </div>
                        {filters && (
                            <Drawer>
                                <DrawerTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full border-border">
                                        <Filter className="h-4 w-4" />
                                    </Button>
                                </DrawerTrigger>
                                <DrawerContent>
                                    <div className="mx-auto w-full max-w-md">
                                        <DrawerHeader className="border-b pb-4">
                                            <DrawerTitle>Filtros</DrawerTitle>
                                        </DrawerHeader>
                                        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                                            {filters}
                                        </div>
                                        <DrawerFooter className="border-t pt-4 bg-muted/30">
                                            <DrawerClose asChild>
                                                <Button className="w-full h-12 font-bold uppercase tracking-widest">Aplicar Filtros</Button>
                                            </DrawerClose>
                                        </DrawerFooter>
                                    </div>
                                </DrawerContent>
                            </Drawer>
                        )}
                    </div>
                </div>
            )}

            <div className={cn(
                "flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border"
            )}>
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Carregando...</p>
                        </div>
                    </div>
                ) : (
                    React.Children.map(children, child => {
                        if (React.isValidElement(child) && child.type === CrudDataView) {
                            return React.cloneElement(child, { view } as any)
                        }
                        return child
                    })
                )}
            </div>

            <div className="border-t border-border bg-background py-2 shrink-0 px-6 h-14 flex items-center">
                <div className="flex items-center justify-between w-full gap-4">
                    <div className="flex items-center gap-4">
                        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                            <span className="text-foreground font-bold">{totalItems}</span> itens
                        </div>

                        {!isMobile && (
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Por página:</span>
                                <Select
                                    value={limit.toString()}
                                    onValueChange={(v) => onLimitChange(Number(v))}
                                >
                                    <SelectTrigger size="sm" className="h-7 w-[65px] text-[10px] font-bold bg-muted/30 border-none ring-0 focus:ring-0">
                                        <SelectValue placeholder={limit.toString()} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[10, 15, 20, 50, 100].map((v) => (
                                            <SelectItem key={v} value={v.toString()} className="text-[10px]">
                                                {v}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => onPageChange(Math.max(1, page - 1))}
                            disabled={page === 1 || isLoading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {!isMobile && (
                            <div className="flex items-center gap-1 mx-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={page === pageNum ? "secondary" : "ghost"}
                                            size="sm"
                                            className={cn(
                                                "h-7 w-7 text-[10px] font-bold p-0 rounded-full transition-all",
                                                page === pageNum ? "bg-primary/10 text-primary shadow-none" : "hover:bg-muted"
                                            )}
                                            onClick={() => onPageChange(pageNum)}
                                        >
                                            {pageNum}
                                        </Button>
                                    )
                                })}
                                {totalPages > 5 && (
                                    <span className="text-[10px] text-muted-foreground px-1 font-bold">...</span>
                                )}
                            </div>
                        )}

                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => onPageChange(page + 1)}
                            disabled={!hasMore || isLoading}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* FAB Button */}
            {onAdd && (
                <Button
                    onClick={onAdd}
                    size="icon"
                    className="fixed bottom-20 right-8 h-14 w-14 rounded-full shadow-2xl hover:shadow-primary/40 hover:scale-110 active:scale-95 transition-all z-50 animate-in fade-in zoom-in duration-300"
                >
                    <Plus className="h-7 w-7" />
                </Button>
            )}
        </section>
    )
}
