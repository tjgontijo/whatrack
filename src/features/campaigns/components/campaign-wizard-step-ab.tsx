'use client'

import React from 'react'
import { Plus, Trash2, Trophy, FlaskConical, Info } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { WhatsAppTemplate } from '@/types/whatsapp/whatsapp'

const VARIANT_LABELS = ['A', 'B', 'C', 'D', 'E'] as const
type VariantLabel = typeof VARIANT_LABELS[number]

export interface AbTestVariantDraft {
  label: VariantLabel
  templateName: string
  templateLang: string
  splitPercent: number
}

export interface AbTestConfigDraft {
  windowHours: 4 | 8 | 12 | 24 | 48
  winnerCriteria: 'RESPONSE_RATE' | 'READ_RATE' | 'MANUAL'
  remainderPercent: number
}

interface CampaignWizardStepAbProps {
  isAbTest: boolean
  variants: AbTestVariantDraft[]
  config: AbTestConfigDraft
  templates: WhatsAppTemplate[]
  /** The first variant's template is pre-selected from Step 1 */
  primaryTemplateName: string
  primaryTemplateLang: string
  onIsAbTestChange: (v: boolean) => void
  onVariantsChange: (v: AbTestVariantDraft[]) => void
  onConfigChange: (c: AbTestConfigDraft) => void
}

const WINDOW_OPTIONS: { value: 4 | 8 | 12 | 24 | 48; label: string }[] = [
  { value: 4, label: '4 horas' },
  { value: 8, label: '8 horas' },
  { value: 12, label: '12 horas' },
  { value: 24, label: '24 horas' },
  { value: 48, label: '48 horas' },
]

const CRITERIA_OPTIONS = [
  { value: 'RESPONSE_RATE', label: 'Taxa de resposta' },
  { value: 'READ_RATE', label: 'Taxa de leitura' },
  { value: 'MANUAL', label: 'Manual (você escolhe)' },
]

function totalPercent(variants: AbTestVariantDraft[], remainderPercent: number) {
  return variants.reduce((s, v) => s + v.splitPercent, 0) + remainderPercent
}

export function CampaignWizardStepAb({
  isAbTest,
  variants,
  config,
  templates,
  primaryTemplateName,
  primaryTemplateLang,
  onIsAbTestChange,
  onVariantsChange,
  onConfigChange,
}: CampaignWizardStepAbProps) {
  const approvedTemplates = templates.filter((t) => t.status === 'APPROVED')

  const total = totalPercent(variants, config.remainderPercent)
  const isValid = isAbTest
    ? total === 100 &&
      variants.length >= 2 &&
      new Set(variants.map((v) => v.templateName)).size === variants.length
    : true

  function addVariant() {
    const nextLabel = VARIANT_LABELS[variants.length] as VariantLabel
    onVariantsChange([
      ...variants,
      { label: nextLabel, templateName: '', templateLang: 'pt_BR', splitPercent: 0 },
    ])
  }

  function removeVariant(index: number) {
    const next = variants.filter((_, i) => i !== index)
    // Re-label
    const relabeled = next.map((v, i) => ({ ...v, label: VARIANT_LABELS[i] as VariantLabel }))
    onVariantsChange(relabeled)
  }

  function updateVariant(index: number, patch: Partial<AbTestVariantDraft>) {
    const next = variants.map((v, i) => (i === index ? { ...v, ...patch } : v))
    onVariantsChange(next)
  }

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-purple-500" />
            <p className="font-semibold">Teste A/B</p>
          </div>
          <p className="text-muted-foreground text-sm">
            Divida a audiência entre diferentes templates e descubra qual performa melhor antes de disparar para todos.
          </p>
        </div>
        <Switch
          id="ab-test-toggle"
          checked={isAbTest}
          onCheckedChange={onIsAbTestChange}
        />
      </div>

      {isAbTest && (
        <>
          {/* Variants */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold">Variantes</CardTitle>
              {variants.length < 5 && (
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addVariant}>
                  <Plus className="h-3 w-3" />
                  Adicionar variante
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {variants.map((variant, index) => {
                const usedTemplates = variants
                  .filter((_, i) => i !== index)
                  .map((v) => v.templateName)

                return (
                  <div
                    key={variant.label}
                    className="rounded-lg border p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="font-bold bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/30"
                      >
                        Variante {variant.label}
                      </Badge>
                      {variants.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeVariant(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-[1fr_auto] gap-3">
                      {/* Template */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Template</Label>
                        <Select
                          value={variant.templateName}
                          onValueChange={(val) => {
                            const tpl = approvedTemplates.find((t) => t.name === val)
                            updateVariant(index, {
                              templateName: val,
                              templateLang: tpl?.language ?? 'pt_BR',
                            })
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione um template" />
                          </SelectTrigger>
                          <SelectContent>
                            {approvedTemplates.map((t) => (
                              <SelectItem
                                key={t.name}
                                value={t.name}
                                disabled={usedTemplates.includes(t.name)}
                              >
                                {t.name} ({t.language})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Split % */}
                      <div className="space-y-1.5 w-20">
                        <Label className="text-xs">% audiência</Label>
                        <Input
                          className="h-8 text-xs text-center"
                          type="number"
                          min={1}
                          max={99}
                          value={variant.splitPercent || ''}
                          placeholder="0"
                          onChange={(e) =>
                            updateVariant(index, { splitPercent: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>

                    {/* Template preview */}
                    {variant.templateName && (() => {
                      const tpl = approvedTemplates.find((t) => t.name === variant.templateName)
                      const body = tpl?.components?.find((c) => c.type === 'BODY')?.text
                      return body ? (
                        <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2 whitespace-pre-wrap line-clamp-2">
                          {body}
                        </p>
                      ) : null
                    })()}
                  </div>
                )
              })}

              {/* Distribution summary */}
              <div
                className={`flex items-center justify-between rounded-lg p-3 text-sm font-medium ${
                  total === 100
                    ? 'bg-green-50 text-green-700 dark:bg-green-950/20'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/20'
                }`}
              >
                <span>Total distribuído</span>
                <span>{total}% / 100%</span>
              </div>

              {/* Duplicate template warning */}
              {variants.length >= 2 &&
                new Set(variants.map((v) => v.templateName).filter(Boolean)).size <
                  variants.filter((v) => v.templateName).length && (
                <p className="flex items-center gap-1.5 text-xs text-amber-600">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Cada variante deve usar um template diferente.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Config */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Trophy className="h-4 w-4 text-amber-500" />
                Configuração do teste
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Window */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Janela de coleta de dados</Label>
                  <Select
                    value={String(config.windowHours)}
                    onValueChange={(v) =>
                      onConfigChange({ ...config, windowHours: Number(v) as AbTestConfigDraft['windowHours'] })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WINDOW_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Tempo de espera antes de selecionar o vencedor.
                  </p>
                </div>

                {/* Criteria */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Critério de vitória</Label>
                  <Select
                    value={config.winnerCriteria}
                    onValueChange={(v) =>
                      onConfigChange({ ...config, winnerCriteria: v as AbTestConfigDraft['winnerCriteria'] })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRITERIA_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {config.winnerCriteria === 'MANUAL'
                      ? 'Você decidirá manualmente pelo painel.'
                      : 'O sistema seleciona automaticamente ao fim da janela.'}
                  </p>
                </div>
              </div>

              {/* Remainder */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Percentual restante{' '}
                  <span className="text-muted-foreground">(audiência que receberá o template vencedor)</span>
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    className="h-8 w-24 text-xs"
                    value={config.remainderPercent || ''}
                    placeholder="0"
                    onChange={(e) =>
                      onConfigChange({ ...config, remainderPercent: Number(e.target.value) })
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {config.remainderPercent > 0
                      ? `${config.remainderPercent}% será enviado com o template vencedor após a janela.`
                      : 'Sem disparo de restante.'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!isAbTest && (
        <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">
          Ative o Teste A/B acima para configurar variantes de template e medir qual converte melhor.
        </div>
      )}
    </div>
  )
}
