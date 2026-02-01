'use client'

import React from 'react'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'

interface CrudEditDrawerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    subtitle?: string
    icon?: React.ElementType
    children: React.ReactNode
    onSave?: () => void
    isSaving?: boolean
    saveLabel?: string
    maxWidth?: string
    showFooter?: boolean
}

export function CrudEditDrawer({
    open,
    onOpenChange,
    title,
    subtitle,
    icon: Icon,
    children,
    onSave,
    isSaving = false,
    saveLabel = 'Salvar Alterações',
    maxWidth = 'max-w-xl',
    showFooter = true
}: CrudEditDrawerProps) {
    return (
        <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
            <DrawerContent className="h-[100dvh] max-h-none rounded-none border-none bg-background data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-none will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                <div className={cn("mx-auto w-full flex flex-col h-full overflow-hidden", maxWidth)}>
                    <DrawerHeader className="border-b pb-4 shrink-0 px-6 pt-6 text-left items-start">
                        <div className="flex items-start justify-between w-full">
                            <div className="flex items-start gap-4 min-w-0">
                                {Icon && (
                                    <div className="h-12 w-12 flex items-center justify-center bg-primary/10 rounded-xl shrink-0">
                                        <Icon className="h-6 w-6 text-primary" />
                                    </div>
                                )}
                                <div className="flex flex-col min-w-0 text-left items-start">
                                    <DrawerTitle className="text-2xl font-bold tracking-tight truncate leading-tight">
                                        {title}
                                    </DrawerTitle>
                                    {subtitle && (
                                        <DrawerDescription className="text-sm text-muted-foreground mt-1 text-left">
                                            {subtitle}
                                        </DrawerDescription>
                                    )}
                                </div>
                            </div>

                            <DrawerClose asChild>
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <X className="h-5 w-5" />
                                </Button>
                            </DrawerClose>
                        </div>
                    </DrawerHeader>

                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin focus:outline-none">
                        <div className="w-full pb-10">
                            {children}
                        </div>
                    </div>

                    {showFooter && (
                        <DrawerFooter className="border-t pt-4 bg-background/80 backdrop-blur-md shrink-0 px-6 pb-8">
                            <div className="flex gap-3 justify-end">
                                <DrawerClose asChild>
                                    <Button
                                        variant="outline"
                                        className="h-10 px-6 font-medium"
                                        disabled={isSaving}
                                    >
                                        Cancelar
                                    </Button>
                                </DrawerClose>
                                {onSave && (
                                    <Button
                                        className="h-10 px-8 font-bold min-w-[140px]"
                                        onClick={onSave}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Salvando...
                                            </>
                                        ) : (
                                            saveLabel
                                        )}
                                    </Button>
                                )}
                            </div>
                        </DrawerFooter>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    )
}
