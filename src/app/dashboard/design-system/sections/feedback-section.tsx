'use client'

import { toast } from 'sonner'
import { Info, TriangleAlert, CircleCheck, OctagonX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

import { SectionWrapper, ShowcaseBox } from './shared'

export function FeedbackSection() {
  return (
    <SectionWrapper
      id="feedback"
      title="Feedback"
      description="Componentes para comunicar estados, erros, sucesso e carregamento ao usuário."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <ShowcaseBox>
          <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-widest">
            Alerts
          </h3>
          <div className="space-y-3">
            <Alert>
              <Info className="size-4" />
              <AlertTitle>Informação</AlertTitle>
              <AlertDescription>Sua conta será verificada em até 24 horas.</AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <OctagonX className="size-4" />
              <AlertTitle>Erro ao salvar</AlertTitle>
              <AlertDescription>
                Não foi possível conectar ao servidor. Tente novamente.
              </AlertDescription>
            </Alert>
          </div>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-widest">
            Toasts (Sonner)
          </h3>
          <p className="text-muted-foreground mb-3 text-xs">
            Clique para disparar cada tipo de notificação.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.success('Registro salvo com sucesso!')}
            >
              <CircleCheck className="text-success size-4" />
              Success
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.error('Erro ao processar a solicitação.')}
            >
              <OctagonX className="text-destructive size-4" />
              Error
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.warning('Atenção: limite de envios atingido.')}
            >
              <TriangleAlert className="text-warning size-4" />
              Warning
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.info('Nova mensagem recebida.')}
            >
              <Info className="text-info size-4" />
              Info
            </Button>
          </div>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-widest">
            Skeleton Loading
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
            <Skeleton className="h-24 w-full" />
          </div>
        </ShowcaseBox>

        <ShowcaseBox>
          <h3 className="text-muted-foreground mb-4 text-xs font-semibold uppercase tracking-widest">
            Avatares
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-muted-foreground mb-2 text-xs">Tamanhos</p>
              <div className="flex items-center gap-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Avatar size="sm">
                        <AvatarFallback>SM</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>size=&quot;sm&quot; (24px)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger>
                      <Avatar>
                        <AvatarFallback>DF</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>size=&quot;default&quot; (32px)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger>
                      <Avatar size="lg">
                        <AvatarFallback>LG</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>size=&quot;lg&quot; (40px)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground mb-2 text-xs">Avatar Group</p>
              <AvatarGroup>
                <Avatar>
                  <AvatarFallback>MS</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>JS</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>AC</AvatarFallback>
                </Avatar>
                <AvatarGroupCount>+5</AvatarGroupCount>
              </AvatarGroup>
            </div>
          </div>
        </ShowcaseBox>
      </div>
    </SectionWrapper>
  )
}
