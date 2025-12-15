'use client'

import { UseFormReturn } from 'react-hook-form'

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  attendantsOptions,
  leadsPerDayOptions,
  avgTicketOptions,
  monthlyRevenueOptions,
  mainChannelOptions,
  adPlatformOptions,
  monthlyAdSpendOptions,
  mainPainPointOptions,
  type SignUpCompleteData,
} from '@/lib/schema/sign-up'

interface Step3BusinessProps {
  form: UseFormReturn<SignUpCompleteData>
  onNext: () => void
  onBack: () => void
}

interface OptionButtonProps {
  value: string
  label: string
  selected: boolean
  onClick: () => void
}

function OptionButton({ label, selected, onClick }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all',
        selected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-muted hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </button>
  )
}

export function Step3Business({ form, onNext, onBack }: Step3BusinessProps) {
  const handleNext = async () => {
    const isValid = await form.trigger([
      'attendantsCount',
      'leadsPerDay',
      'avgTicket',
      'monthlyRevenue',
      'mainChannel',
      'mainPainPoint',
    ])
    if (isValid) {
      onNext()
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Conte-nos sobre seu negócio</h2>
        <p className="text-lg text-muted-foreground">
          Essas informações nos ajudam a personalizar sua experiência
        </p>
      </div>

      <div className="space-y-5">
        <FormField
          control={form.control}
          name="attendantsCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantos atendentes você tem?</FormLabel>
              <FormControl>
                <div className="flex flex-wrap gap-2">
                  {attendantsOptions.map((option) => (
                    <OptionButton
                      key={option.value}
                      value={option.value}
                      label={option.label}
                      selected={field.value === option.value}
                      onClick={() => field.onChange(option.value)}
                    />
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="leadsPerDay"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantos leads você recebe por dia?</FormLabel>
              <FormControl>
                <div className="flex flex-wrap gap-2">
                  {leadsPerDayOptions.map((option) => (
                    <OptionButton
                      key={option.value}
                      value={option.value}
                      label={option.label}
                      selected={field.value === option.value}
                      onClick={() => field.onChange(option.value)}
                    />
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="avgTicket"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Qual seu ticket médio?</FormLabel>
              <FormControl>
                <div className="flex flex-wrap gap-2">
                  {avgTicketOptions.map((option) => (
                    <OptionButton
                      key={option.value}
                      value={option.value}
                      label={option.label}
                      selected={field.value === option.value}
                      onClick={() => field.onChange(option.value)}
                    />
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="monthlyRevenue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Faturamento mensal aproximado?</FormLabel>
              <FormControl>
                <div className="flex flex-wrap gap-2">
                  {monthlyRevenueOptions.map((option) => (
                    <OptionButton
                      key={option.value}
                      value={option.value}
                      label={option.label}
                      selected={field.value === option.value}
                      onClick={() => field.onChange(option.value)}
                    />
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mainChannel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Principal canal de vendas?</FormLabel>
              <FormControl>
                <div className="flex flex-wrap gap-2">
                  {mainChannelOptions.map((option) => (
                    <OptionButton
                      key={option.value}
                      value={option.value}
                      label={option.label}
                      selected={field.value === option.value}
                      onClick={() => field.onChange(option.value)}
                    />
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="adPlatforms"
          render={() => (
            <FormItem>
              <FormLabel>Em quais plataformas você anuncia?</FormLabel>
              <div className="space-y-2">
                {adPlatformOptions.map((option) => (
                  <FormField
                    key={option.value}
                    control={form.control}
                    name={`adPlatforms.${option.value}` as keyof SignUpCompleteData}
                    render={({ field }) => (
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`platform-${option.value}`}
                          checked={field.value as boolean}
                          onCheckedChange={field.onChange}
                        />
                        <Label
                          htmlFor={`platform-${option.value}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {option.label}
                        </Label>
                      </div>
                    )}
                  />
                ))}
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="monthlyAdSpend"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Investimento mensal em anúncios?</FormLabel>
              <FormControl>
                <div className="flex flex-wrap gap-2">
                  {monthlyAdSpendOptions.map((option) => (
                    <OptionButton
                      key={option.value}
                      value={option.value}
                      label={option.label}
                      selected={field.value === option.value}
                      onClick={() => field.onChange(option.value)}
                    />
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mainPainPoint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Qual sua maior dor hoje?</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  {mainPainPointOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => field.onChange(option.value)}
                      className={cn(
                        'w-full rounded-lg border-2 px-4 py-3 text-left text-sm transition-all',
                        field.value === option.value
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-muted-foreground/50'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          Voltar
        </Button>
        <Button type="button" className="flex-1" onClick={handleNext}>
          Próximo
        </Button>
      </div>
    </div>
  )
}
