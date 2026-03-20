'use client'

import Link from 'next/link'
import { CheckCircle2, CircleDashed, ArrowRight, Clock3 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useProjectRouteContext } from '@/hooks/project/project-route-context'

type WelcomeActivationChecklistProps = {
  projectName: string
  trialEndsAt: string | null
  trialExpired: boolean
  trialDaysRemaining: number | null
  checklist: {
    whatsappConnected: boolean
    metaAdsConnected: boolean
    trackedConversationDetected: boolean
  }
}

function ChecklistItem(props: {
  done: boolean
  title: string
  description: string
  href?: string
  cta?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
      {props.done ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
      ) : (
        <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-foreground">{props.title}</p>
          <Badge variant={props.done ? 'default' : 'secondary'}>
            {props.done ? 'Concluído' : 'Pendente'}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{props.description}</p>
        {props.href && props.cta ? (
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link href={props.href}>{props.cta}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function WelcomeActivationChecklist({
  projectName,
  trialEndsAt,
  trialExpired,
  trialDaysRemaining,
  checklist,
}: WelcomeActivationChecklistProps) {
  const routeContext = useProjectRouteContext()
  const activationMilestoneReached = checklist.whatsappConnected && checklist.metaAdsConnected
  const basePath = routeContext
    ? `/${routeContext.organizationSlug}/${routeContext.projectSlug}`
    : '/dashboard'

  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-background/95 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Projeto ativo: {projectName}</CardTitle>
              <CardDescription>
                Conecte WhatsApp e Meta Ads para atingir o activation milestone da primeira sessão.
              </CardDescription>
            </div>
            <Badge variant={trialExpired ? 'destructive' : 'secondary'} className="gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              {trialExpired
                ? 'Trial expirado'
                : trialDaysRemaining != null
                  ? `${trialDaysRemaining} dia(s) restantes`
                  : 'Trial ativo'}
            </Badge>
          </div>
          {trialEndsAt ? (
            <p className="text-sm text-muted-foreground">
              Trial ativo até {new Date(trialEndsAt).toLocaleDateString('pt-BR')}.
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-4">
          <ChecklistItem
            done={checklist.whatsappConnected}
            title="Conectar WhatsApp"
            description="Conecte o número do cliente em modo de coexistência para começar a rastrear as conversas."
            href={`${basePath}/settings/whatsapp`}
            cta="Conectar WhatsApp"
          />

          <ChecklistItem
            done={checklist.metaAdsConnected}
            title="Conectar Meta Ads"
            description="Associe a conta de anúncios do cliente para fechar o caminho do anúncio até a conversa."
            href={`${basePath}/settings/meta-ads`}
            cta="Conectar Meta Ads"
          />

          <ChecklistItem
            done={checklist.trackedConversationDetected}
            title="Ver a primeira conversa rastreada"
            description="Esse é o aha moment. Ele acontece quando a campanha começar a gerar cliques reais para o WhatsApp."
            href={`${basePath}/tickets`}
            cta="Ver tickets"
          />

          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            {activationMilestoneReached ? (
              <p>
                Activation milestone concluído. Agora espere os primeiros cliques de campanha para ver
                a primeira conversa rastreada aparecer no produto.
              </p>
            ) : (
              <p>
                Foque primeiro em conectar WhatsApp e Meta Ads. Esse é o milestone operacional que dá
                contexto para o seu teste grátis.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={basePath}>
                Ir para o dashboard
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link href={`${basePath}/billing`}>Gerenciar trial e upgrade</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
