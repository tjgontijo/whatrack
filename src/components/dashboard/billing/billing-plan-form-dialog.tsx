'use client'

import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Controller, useForm } from 'react-hook-form'
import { Layers3 } from 'lucide-react'
import { toast } from 'sonner'

import { CrudEditDrawer } from '@/components/dashboard/crud'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch } from '@/lib/api-client'
import {
  billingPlanAddonTypes,
  billingPlanCreateSchema,
  billingPlanKinds,
  billingPlanSupportLevels,
  type BillingPlanListItem,
} from '@/schemas/billing/billing-plan-schemas'

type BillingPlanFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan?: BillingPlanListItem | null
  onSuccess?: () => void
}

const billingPlanFormSchema = billingPlanCreateSchema
  .omit({ features: true, additionals: true })
  .extend({
    featuresText: z.string().optional().default(''),
    additionalsText: z.string().optional().default(''),
  })

type BillingPlanFormInput = z.input<typeof billingPlanFormSchema>
type BillingPlanFormValues = z.output<typeof billingPlanFormSchema>

function toLines(values: string[]) {
  return values.join('\n')
}

function fromLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function BillingPlanFormDialog({
  open,
  onOpenChange,
  plan,
  onSuccess,
}: BillingPlanFormDialogProps) {
  const isEditMode = Boolean(plan)

  const {
    control,
    register,
    watch,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BillingPlanFormInput, undefined, BillingPlanFormValues>({
    resolver: zodResolver(billingPlanFormSchema),
    defaultValues: {
      name: plan?.name ?? '',
      slug: plan?.slug ?? '',
      description: plan?.description ?? '',
      kind: plan?.kind ?? 'base',
      addonType: plan?.addonType ?? null,
      subtitle: plan?.subtitle ?? '',
      cta: plan?.cta ?? '',
      monthlyPrice: Number(plan?.monthlyPrice ?? 0),
      currency: plan?.currency ?? 'BRL',
      includedProjects: plan?.includedProjects ?? 0,
      includedWhatsAppPerProject: plan?.includedWhatsAppPerProject ?? 0,
      includedMetaAdAccountsPerProject: plan?.includedMetaAdAccountsPerProject ?? 0,
      includedConversionsPerProject: plan?.includedConversionsPerProject ?? 0,
      includedAiCreditsPerProject: plan?.includedAiCreditsPerProject ?? 0,
      supportLevel: (plan?.supportLevel as BillingPlanFormValues['supportLevel']) ?? 'priority',
      displayOrder: plan?.displayOrder ?? 0,
      isHighlighted: plan?.isHighlighted ?? false,
      contactSalesOnly: plan?.contactSalesOnly ?? false,
      isActive: plan?.isActive ?? true,
      trialDays: plan?.trialDays ?? 14,
      featuresText: toLines(plan?.features ?? []),
      additionalsText: toLines(plan?.additionals ?? []),
    },
  })

  const kind = watch('kind')

  useEffect(() => {
    reset({
      name: plan?.name ?? '',
      slug: plan?.slug ?? '',
      description: plan?.description ?? '',
      kind: plan?.kind ?? 'base',
      addonType: plan?.addonType ?? null,
      subtitle: plan?.subtitle ?? '',
      cta: plan?.cta ?? '',
      monthlyPrice: Number(plan?.monthlyPrice ?? 0),
      currency: plan?.currency ?? 'BRL',
      includedProjects: plan?.includedProjects ?? 0,
      includedWhatsAppPerProject: plan?.includedWhatsAppPerProject ?? 0,
      includedMetaAdAccountsPerProject: plan?.includedMetaAdAccountsPerProject ?? 0,
      includedConversionsPerProject: plan?.includedConversionsPerProject ?? 0,
      includedAiCreditsPerProject: plan?.includedAiCreditsPerProject ?? 0,
      supportLevel: (plan?.supportLevel as BillingPlanFormValues['supportLevel']) ?? 'priority',
      displayOrder: plan?.displayOrder ?? 0,
      isHighlighted: plan?.isHighlighted ?? false,
      contactSalesOnly: plan?.contactSalesOnly ?? false,
      isActive: plan?.isActive ?? true,
      trialDays: plan?.trialDays ?? 14,
      featuresText: toLines(plan?.features ?? []),
      additionalsText: toLines(plan?.additionals ?? []),
    })
  }, [plan, reset, open])

  const close = () => onOpenChange(false)

  const submit = async (values: BillingPlanFormValues) => {
    try {
      const payload = billingPlanCreateSchema.parse({
        ...values,
        features: fromLines(values.featuresText),
        additionals: fromLines(values.additionalsText),
        addonType: values.kind === 'addon' ? values.addonType : null,
      })

      await apiFetch(
        isEditMode ? `/api/v1/system/billing-plans/${plan!.id}` : '/api/v1/system/billing-plans',
        {
          method: isEditMode ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )

      toast.success(isEditMode ? 'Plano atualizado' : 'Plano criado')
      close()
      onSuccess?.()
      reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar plano')
    }
  }

  return (
    <CrudEditDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? 'Editar plano' : 'Novo plano'}
      subtitle="Gerencie plano base e add-ons do modelo de agência."
      icon={Layers3}
      showFooter={false}
      desktopDirection="right"
      mobileDirection="bottom"
      maxWidth="max-w-[920px]"
      desktopPanelWidthClassName="data-[side=right]:!w-[min(96vw,980px)] data-[side=right]:sm:!max-w-none"
    >
      <form className="space-y-8" onSubmit={handleSubmit(submit)}>
        <FieldGroup className="grid gap-4 lg:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="billing-plan-name">Nome *</FieldLabel>
            <FieldContent>
              <Input id="billing-plan-name" placeholder="WhaTrack" {...register('name')} />
              <FieldError errors={[errors.name]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="billing-plan-slug">Slug *</FieldLabel>
            <FieldContent>
              <Input id="billing-plan-slug" placeholder="platform_base" {...register('slug')} />
              <FieldError errors={[errors.slug]} />
            </FieldContent>
          </Field>
        </FieldGroup>

        <FieldGroup className="grid gap-4 lg:grid-cols-2">
          <Field>
            <FieldLabel>Tipo *</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="kind"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {billingPlanKinds.map((kindValue) => (
                        <SelectItem key={kindValue} value={kindValue}>
                          {kindValue === 'base' ? 'Plano base' : 'Add-on'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Tipo de add-on</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="addonType"
                render={({ field }) => (
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={(value) => field.onChange(value)}
                    disabled={kind !== 'addon'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {billingPlanAddonTypes.map((addonType) => (
                        <SelectItem key={addonType} value={addonType}>
                          {addonType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.addonType]} />
            </FieldContent>
          </Field>
        </FieldGroup>

        <Field>
          <FieldLabel htmlFor="billing-plan-description">Descrição</FieldLabel>
          <FieldContent>
            <Textarea id="billing-plan-description" {...register('description')} />
            <FieldError errors={[errors.description]} />
          </FieldContent>
        </Field>

        <FieldGroup className="grid gap-4 lg:grid-cols-4">
          <Field>
            <FieldLabel htmlFor="billing-plan-monthly-price">Preço mensal *</FieldLabel>
            <FieldContent>
              <Input id="billing-plan-monthly-price" type="number" step="0.01" min="0" {...register('monthlyPrice', { valueAsNumber: true })} />
              <FieldError errors={[errors.monthlyPrice]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="billing-plan-currency">Moeda *</FieldLabel>
            <FieldContent>
              <Input id="billing-plan-currency" maxLength={3} {...register('currency')} />
              <FieldError errors={[errors.currency]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="billing-plan-trial-days">Dias grátis *</FieldLabel>
            <FieldContent>
              <Input id="billing-plan-trial-days" type="number" min="0" {...register('trialDays', { valueAsNumber: true })} />
              <FieldError errors={[errors.trialDays]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="billing-plan-display-order">Ordem *</FieldLabel>
            <FieldContent>
              <Input id="billing-plan-display-order" type="number" min="0" {...register('displayOrder', { valueAsNumber: true })} />
              <FieldError errors={[errors.displayOrder]} />
            </FieldContent>
          </Field>
        </FieldGroup>

        <FieldGroup className="grid gap-4 lg:grid-cols-5">
          <Field>
            <FieldLabel htmlFor="billing-plan-projects">Projetos incluídos *</FieldLabel>
            <FieldContent>
              <Input id="billing-plan-projects" type="number" min="0" {...register('includedProjects', { valueAsNumber: true })} />
              <FieldError errors={[errors.includedProjects]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="billing-plan-whatsapp">WhatsApp/projeto *</FieldLabel>
            <FieldContent>
              <Input id="billing-plan-whatsapp" type="number" min="0" {...register('includedWhatsAppPerProject', { valueAsNumber: true })} />
              <FieldError errors={[errors.includedWhatsAppPerProject]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="billing-plan-meta">Meta Ads/projeto *</FieldLabel>
            <FieldContent>
              <Input id="billing-plan-meta" type="number" min="0" {...register('includedMetaAdAccountsPerProject', { valueAsNumber: true })} />
              <FieldError errors={[errors.includedMetaAdAccountsPerProject]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="billing-plan-conversions">Conversões/projeto *</FieldLabel>
            <FieldContent>
              <Input id="billing-plan-conversions" type="number" min="0" {...register('includedConversionsPerProject', { valueAsNumber: true })} />
              <FieldError errors={[errors.includedConversionsPerProject]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="billing-plan-ai">Créditos IA/projeto *</FieldLabel>
            <FieldContent>
              <Input id="billing-plan-ai" type="number" min="0" {...register('includedAiCreditsPerProject', { valueAsNumber: true })} />
              <FieldError errors={[errors.includedAiCreditsPerProject]} />
            </FieldContent>
          </Field>
        </FieldGroup>

        <Field>
          <FieldLabel>Nível de suporte *</FieldLabel>
          <FieldContent>
            <Controller
              control={control}
              name="supportLevel"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {billingPlanSupportLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.supportLevel]} />
          </FieldContent>
        </Field>

        <FieldGroup className="grid gap-4 lg:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="billing-plan-subtitle">Subtítulo</FieldLabel>
            <FieldContent>
              <Input id="billing-plan-subtitle" {...register('subtitle')} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="billing-plan-cta">CTA</FieldLabel>
            <FieldContent>
              <Input id="billing-plan-cta" {...register('cta')} />
            </FieldContent>
          </Field>
        </FieldGroup>

        <FieldGroup className="grid gap-4 lg:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="billing-plan-features">Features</FieldLabel>
            <FieldContent>
              <Textarea id="billing-plan-features" rows={7} {...register('featuresText')} />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="billing-plan-additionals">Adicionais</FieldLabel>
            <FieldContent>
              <Textarea id="billing-plan-additionals" rows={7} {...register('additionalsText')} />
            </FieldContent>
          </Field>
        </FieldGroup>

        <FieldGroup className="grid gap-6 lg:grid-cols-3">
          <Field>
            <FieldContent className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <FieldLabel className="text-sm font-medium">Plano ativo</FieldLabel>
                <FieldDescription>Disponível para contratação.</FieldDescription>
              </div>
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldContent className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <FieldLabel className="text-sm font-medium">Destaque</FieldLabel>
                <FieldDescription>Destacar no catálogo.</FieldDescription>
              </div>
              <Controller
                control={control}
                name="isHighlighted"
                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldContent className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <FieldLabel className="text-sm font-medium">Sob consulta</FieldLabel>
                <FieldDescription>Fluxo comercial manual.</FieldDescription>
              </div>
              <Controller
                control={control}
                name="contactSalesOnly"
                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
              />
            </FieldContent>
          </Field>
        </FieldGroup>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
          <Button type="button" variant="outline" onClick={close} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : isEditMode ? 'Salvar alterações' : 'Criar plano'}
          </Button>
        </div>
      </form>
    </CrudEditDrawer>
  )
}
