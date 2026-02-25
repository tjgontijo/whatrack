'use client'

import React from 'react'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/utils'
import { useIsMobile } from '@/hooks/ui/use-mobile'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer'
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

type DesktopDrawerDirection = 'right' | 'left' | 'bottom'

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
  desktopDirection?: DesktopDrawerDirection
  mobileDirection?: 'bottom'
  desktopPanelWidthClassName?: string
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
  showFooter = true,
  desktopDirection = 'bottom',
  mobileDirection = 'bottom',
  desktopPanelWidthClassName = 'data-[side=right]:!w-[min(94vw,760px)] data-[side=left]:!w-[min(94vw,760px)] data-[side=right]:sm:!max-w-none data-[side=left]:sm:!max-w-none',
}: CrudEditDrawerProps) {
  const isMobile = useIsMobile()

  const useDesktopSheet = !isMobile && desktopDirection !== 'bottom'
  const desktopSide = desktopDirection === 'left' ? 'left' : 'right'
  const sideAlignment = desktopSide === 'right' ? 'ml-auto' : 'mr-auto'

  if (useDesktopSheet) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={desktopSide}
          showCloseButton={false}
          className={cn('h-[100dvh] border-none p-0', desktopPanelWidthClassName)}
        >
          <div className={cn('flex h-full w-full flex-col overflow-hidden', maxWidth, sideAlignment)}>
            <div className="shrink-0 border-b px-6 pb-4 pt-6 text-left">
              <div className="flex w-full items-start justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  {Icon && (
                    <div className="bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                      <Icon className="text-primary h-6 w-6" />
                    </div>
                  )}
                  <div className="flex min-w-0 flex-col items-start text-left">
                    <SheetTitle className="truncate text-2xl font-bold leading-tight tracking-tight">
                      {title}
                    </SheetTitle>
                    {subtitle && (
                      <SheetDescription className="text-muted-foreground mt-1 text-left text-sm">
                        {subtitle}
                      </SheetDescription>
                    )}
                  </div>
                </div>

                <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <X className="h-5 w-5" />
                  </Button>
                </SheetClose>
              </div>
            </div>

            <div className="scrollbar-thin flex-1 overflow-y-auto p-6 focus:outline-none">
              <div className="w-full pb-10">{children}</div>
            </div>

            {showFooter && (
              <div className="bg-background/80 shrink-0 border-t px-6 pb-8 pt-4 backdrop-blur-md">
                <div className="flex justify-end gap-3">
                  <SheetClose asChild>
                    <Button variant="outline" className="h-10 px-6 font-medium" disabled={isSaving}>
                      Cancelar
                    </Button>
                  </SheetClose>
                  {onSave && (
                    <Button
                      className="h-10 min-w-[140px] px-8 font-bold"
                      onClick={onSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        saveLabel
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false} direction={mobileDirection}>
      <DrawerContent
        className="bg-background h-[100dvh] max-h-none rounded-none border-none transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-none"
      >
        <div className={cn('mx-auto flex h-full w-full flex-col overflow-hidden', maxWidth)}>
          <DrawerHeader className="shrink-0 items-start border-b px-6 pb-4 pt-6 text-left">
            <div className="flex w-full items-start justify-between">
              <div className="flex min-w-0 items-start gap-4">
                {Icon && (
                  <div className="bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                    <Icon className="text-primary h-6 w-6" />
                  </div>
                )}
                <div className="flex min-w-0 flex-col items-start text-left">
                  <DrawerTitle className="truncate text-2xl font-bold leading-tight tracking-tight">
                    {title}
                  </DrawerTitle>
                  {subtitle && (
                    <DrawerDescription className="text-muted-foreground mt-1 text-left text-sm">
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

          <div className="scrollbar-thin flex-1 overflow-y-auto p-6 focus:outline-none">
            <div className="w-full pb-10">{children}</div>
          </div>

          {showFooter && (
            <DrawerFooter className="bg-background/80 shrink-0 border-t px-6 pb-8 pt-4 backdrop-blur-md">
              <div className="flex justify-end gap-3">
                <DrawerClose asChild>
                  <Button variant="outline" className="h-10 px-6 font-medium" disabled={isSaving}>
                    Cancelar
                  </Button>
                </DrawerClose>
                {onSave && (
                  <Button
                    className="h-10 min-w-[140px] px-8 font-bold"
                    onClick={onSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
