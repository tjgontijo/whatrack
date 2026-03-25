'use client'

import { CalendarClock, Send } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface CampaignWizardStepDispatchProps {
  dispatchNow: boolean
  scheduledAt: string
  summary: {
    name: string
    instanceLabel: string
    templateCategory: string
    templateName: string
    recipientCount: number
    variableCount: number
  }
  onDispatchModeChange: (dispatchNow: boolean) => void
  onScheduledAtChange: (value: string) => void
}

export function CampaignWizardStepDispatch({
  dispatchNow,
  scheduledAt,
  summary,
  onDispatchModeChange,
  onScheduledAtChange,
}: CampaignWizardStepDispatchProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quando disparar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant={dispatchNow ? 'default' : 'outline'}
              onClick={() => onDispatchModeChange(true)}
            >
              <Send className="mr-2 h-4 w-4" />
              Disparar agora
            </Button>
            <Button
              type="button"
              variant={!dispatchNow ? 'default' : 'outline'}
              onClick={() => onDispatchModeChange(false)}
            >
              <CalendarClock className="mr-2 h-4 w-4" />
              Agendar
            </Button>
          </div>

          {!dispatchNow && (
            <div className="space-y-2">
              <Label htmlFor="campaign-scheduled-at">Data e hora</Label>
              <Input
                id="campaign-scheduled-at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => onScheduledAtChange(event.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumo final</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Campanha</p>
            <p className="font-medium">{summary.name}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Instância</p>
            <p className="font-medium">{summary.instanceLabel}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Categoria / template</p>
            <p className="font-medium">
              {summary.templateCategory} · {summary.templateName}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Destinatários válidos</p>
            <p className="font-medium">{summary.recipientCount}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Variáveis mapeadas</p>
            <p className="font-medium">{summary.variableCount}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Modo de disparo</p>
            <p className="font-medium">{dispatchNow ? 'Imediato' : 'Agendado'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
