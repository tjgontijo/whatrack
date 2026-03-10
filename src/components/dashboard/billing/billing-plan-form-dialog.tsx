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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch } from '@/lib/api-client'
import {
  billingPlanCreateSchema,
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
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BillingPlanFormInput, undefined, BillingPlanFormValues>({
    resolver: zodResolver(billingPlanFormSchema),
    defaultValues: {
      name: plan?.name ?? '',
      slug: plan?.slug ?? '',
      description: plan?.description ?? '',
      subtitle: plan?.subtitle ?? '',
      cta: plan?.cta ?? '',
      monthlyPrice: Number(plan?.monthlyPrice ?? 0),
      currency: plan?.currency ?? 'BRL',
      eventLimitPerMonth: plan?.eventLimitPerMonth ?? 200,
      overagePricePerEvent: Number(plan?.overagePricePerEvent ?? 0),
      maxWhatsAppNumbers: plan?.maxWhatsAppNumbers ?? 1,
      maxAdAccounts: plan?.maxAdAccounts ?? 1,
      maxTeamMembers: plan?.maxTeamMembers ?? 1,
      supportLevel: (plan?.supportLevel as BillingPlanFormValues['supportLevel']) ?? 'email',
      displayOrder: plan?.displayOrder ?? 0,
      isHighlighted: plan?.isHighlighted ?? false,
      contactSalesOnly: plan?.contactSalesOnly ?? false,
      isActive: plan?.isActive ?? true,
      trialDays: plan?.trialDays ?? 7,
      featuresText: toLines(plan?.features ?? []),
      additionalsText: toLines(plan?.additionals ?? []),
    },
  })

  useEffect(() => {
    reset({
      name: plan?.name ?? '',
      slug: plan?.slug ?? '',
      description: plan?.description ?? '',
      subtitle: plan?.subtitle ?? '',
      cta: plan?.cta ?? '',
      monthlyPrice: Number(plan?.monthlyPrice ?? 0),
      currency: plan?.currency ?? 'BRL',
      eventLimitPerMonth: plan?.eventLimitPerMonth ?? 200,
      overagePricePerEvent: Number(plan?.overagePricePerEvent ?? 0),
      maxWhatsAppNumbers: plan?.maxWhatsAppNumbers ?? 1,
      maxAdAccounts: plan?.maxAdAccounts ?? 1,
      maxTeamMembers: plan?.maxTeamMembers ?? 1,
      supportLevel: (plan?.supportLevel as BillingPlanFormValues['supportLevel']) ?? 'email',
      displayOrder: plan?.displayOrder ?? 0,
      isHighlighted: plan?.isHighlighted ?? false,
      contactSalesOnly: plan?.contactSalesOnly ?? false,
      isActive: plan?.isActive ?? true,
      trialDays: plan?.trialDays ?? 7,
      featuresText: toLines(plan?.features ?? []),
      additionalsText: toLines(plan?.additionals ?? []),
    })
  }, [plan, reset, open])

  const close = () => onOpenChange(false)

  const submit = async (
    values: BillingPlanFormValues,
  ) => {
    try {
      const payload = billingPlanCreateSchema.parse({
        ...values,
        features: fromLines(values.featuresText),
        additionals: fromLines(values.additionalsText),
      })

      await apiFetch(
        isEditMode
          ? `/api/v1/system/billing-plans/${plan!.id}`
          : '/api/v1/system/billing-plans',
        {
          method: isEditMode ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
      subtitle="Gerencie preço, trial, quotas e a apresentação do plano no produto."
      icon={Layers3}
      showFooter={false}
      desktopDirection="right"
      mobileDirection="bottom"
      maxWidth="max-w-[920px]"
      desktopPanelWidthClassName="data-[side=right]:!w-[min(96vw,980px)] data-[side=right]:sm:!max-w-none"
    >
      <form
        key={plan?.id ?? (open ? 'new' : 'closed')}
        className="space-y-8"
        onSubmit={handleSubmit(submit)}
      >
        <FieldGroup className="grid gap-4 lg:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="billing-plan-name">Nome *</FieldLabel>
            <FieldContent>
              <Input id="billing-plan-name" placeholder="Starter" {...register('name')} />
              <FieldError errors={[errors.name]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="billing-plan-slug">Slug *</FieldLabel>
            <FieldContent>
              <Input id="billing-plan-slug" placeholder="starter" {...register('slug')} />
              <FieldDescription>Usado como identificador técnico do plano.</FieldDescription>
              <FieldError errors={[errors.slug]} />
            </FieldContent>
          </Field>
        </FieldGroup>

        <Field>
          <FieldLabel htmlFor="billing-plan-description">Descrição</FieldLabel>
          <FieldContent>
            <Textarea
              id="billing-plan-description"
              placeholder="Descrição curta para o dashboard e landing."
              {...register('description')}
            />
            <FieldError errors={[errors.description]} />
          </FieldContent>
        </Field>

        <FieldGroup className="grid gap-4 lg:grid-cols-4">
          <Field>
            <FieldLabel htmlFor="billing-plan-monthly-price">Preço mensal *</FieldLabel>
            <FieldContent>
              <Input
                id="billing-plan-monthly-price"
                type="number"
                step="0.01"
                min="0"
                {...register('monthlyPrice', { valueAsNumber: true })}
              />
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
              <Input
                id="billing-plan-trial-days"
                type="number"
                min="0"
                {...register('trialDays', { valueAsNumber: true })}
              />
              <FieldError errors={[errors.trialDays]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="billing-plan-display-order">Ordem *</FieldLabel>
            <FieldContent>
              <Input
                id="billing-plan-display-order"
                type="number"
                min="0"
                {...register('displayOrder', { valueAsNumber: true })}
              />
              <FieldError errors={[errors.displayOrder]} />
            </FieldContent>
          </Field>
        </FieldGroup>

        <FieldGroup className="grid gap-4 lg:grid-cols-4">
          <Field>
            <FieldLabel htmlFor="billing-plan-events">Eventos/mês *</FieldLabel>
            <FieldContent>
              <Input
                id="billing-plan-events"
                type="number"
                min="0"
                {...register('eventLimitPerMonth', { valueAsNumber: true })}
              />
              <FieldError errors={[errors.eventLimitPerMonth]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="billing-plan-overage">Excedente por evento *</FieldLabel>
            <FieldContent>
              <Input
                id="billing-plan-overage"
                type="number"
                step="0.01"
                min="0"
                {...register('overagePricePerEvent', { valueAsNumber: true })}
              />
              <FieldError errors={[errors.overagePricePerEvent]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="billing-plan-whatsapp">WhatsApps *</FieldLabel>
            <FieldContent>
              <Input
                id="billing-plan-whatsapp"
                type="number"
                min="0"
                {...register('maxWhatsAppNumbers', { valueAsNumber: true })}
              />
              <FieldError errors={[errors.maxWhatsAppNumbers]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="billing-plan-ads">Contas Meta *</FieldLabel>
            <FieldContent>
              <Input
                id="billing-plan-ads"
                type="number"
                min="0"
                {...register('maxAdAccounts', { valueAsNumber: true })}
              />
              <FieldError errors={[errors.maxAdAccounts]} />
            </FieldContent>
          </Field>
        </FieldGroup>

        <FieldGroup className="grid gap-4 lg:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="billing-plan-team">Membros da equipe *</FieldLabel>
            <FieldContent>
              <Input
                id="billing-plan-team"
                type="number"
                min="1"
                {...register('maxTeamMembers', { valueAsNumber: true })}
              />
              <FieldError errors={[errors.maxTeamMembers]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Nível de suporte *</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="supportLevel"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
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
        </FieldGroup>

        <FieldGroup className="grid gap-4 lg:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="billing-plan-subtitle">Subtítulo</FieldLabel>
            <FieldContent>
              <Input
                id="billing-plan-subtitle"
                placeholder="Até 200 eventos / mês"
                {...register('subtitle')}
              />
              <FieldError errors={[errors.subtitle]} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="billing-plan-cta">CTA</FieldLabel>
            <FieldContent>
              <Input id="billing-plan-cta" placeholder="Testar grátis por 14 dias" {...register('cta')} />
              <FieldError errors={[errors.cta]} />
            </FieldContent>
          </Field>
        </FieldGroup>

        <FieldGroup className="grid gap-4 lg:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="billing-plan-features">Features</FieldLabel>
            <FieldContent>
              <Textarea
                id="billing-plan-features"
                rows={8}
                placeholder={'Um item por linha\n1 número de WhatsApp\n1 conta Meta Ads'}
                {...register('featuresText')}
              />
              <FieldDescription>Uma linha por benefício exibido na UI.</FieldDescription>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="billing-plan-additionals">Adicionais</FieldLabel>
            <FieldContent>
              <Textarea
                id="billing-plan-additionals"
                rows={8}
                placeholder={'Uma linha por adicional\nR$ 0,25 por evento extra'}
                {...register('additionalsText')}
              />
              <FieldDescription>Use para observações comerciais e extras.</FieldDescription>
            </FieldContent>
          </Field>
        </FieldGroup>

        <div className="grid gap-3 rounded-2xl border border-border p-4 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <Label className="text-sm font-medium">Plano ativo</Label>
              <p className="text-muted-foreground text-xs">Disponível para novas contratações.</p>
            </div>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <Label className="text-sm font-medium">Plano em destaque</Label>
              <p className="text-muted-foreground text-xs">Recebe destaque visual na UI.</p>
            </div>
            <Controller
              control={control}
              name="isHighlighted"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          <div className="rounded-xl border border-border p-3 md:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label className="text-sm font-medium">Contato comercial</Label>
                <p className="text-muted-foreground mt-1 text-xs">
                  Use quando o plano não deve ir para self-serve no checkout.
                </p>
              </div>

              <Controller
                control={control}
                name="contactSalesOnly"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                  />
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={close} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isEditMode ? 'Salvar alterações' : 'Criar plano'}
          </Button>
        </div>
      </form>
    </CrudEditDrawer>
  )
}
