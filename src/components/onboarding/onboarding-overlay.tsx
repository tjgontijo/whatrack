'use client'

import { useState, useCallback, ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ChevronLeft, Info as InfoIcon, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { z } from 'zod'

import { FormProvider as Form, Controller } from 'react-hook-form'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  attendantsOptions,
  leadsPerDayOptions,
  avgTicketOptions,
  monthlyRevenueOptions,
} from '@/schemas/sign-up'

// Schema do onboarding (7 steps conforme PRD)
const onboardingSchema = z.object({
  hasCnpj: z.boolean().optional(),
  cnpj: z.string().optional(),
  cpf: z.string().optional(),
  companyName: z.string().optional(),
  segment: z.string().optional(),
  // Dados da Receita Federal
  razaoSocial: z.string().optional(),
  nomeFantasia: z.string().optional(),
  cnaeCode: z.string().optional(),
  cnaeDescription: z.string().optional(),
  municipio: z.string().optional(),
  uf: z.string().optional(),
  porte: z.string().optional(),
  tipo: z.string().optional(),
  naturezaJuridica: z.string().optional(),
  capitalSocial: z.number().optional(),
  situacao: z.string().optional(),
  dataAbertura: z.string().optional(),
  dataSituacao: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cep: z.string().optional(),
  email: z.string().optional(),
  telefone: z.string().optional(),
  qsa: z.array(z.object({ nome: z.string(), qual: z.string() })).optional(),
  atividadesSecundarias: z.array(z.object({ code: z.string(), text: z.string() })).optional(),
  simplesOptante: z.boolean().optional(),
  simeiOptante: z.boolean().optional(),
  // Dados do onboarding
  attendantsCount: z.string().min(1, 'Selecione uma opção'),
  leadsPerDay: z.string().min(1, 'Selecione uma opção'),
  avgTicket: z.string().min(1, 'Selecione uma opção'),
  monthlyRevenue: z.string().min(1, 'Selecione uma opção'),
  mainAcquisitionChannel: z.string().min(1, 'Selecione uma opção'),
  monthlyAdSpend: z.string().optional(),
  onboardingStep: z.number().optional(),
})

type OnboardingData = z.infer<typeof onboardingSchema>

const TOTAL_STEPS = 7

// Opções de aquisição
const acquisitionChannelOptions = [
  { value: 'meta', label: 'Meta Ads (Facebook/Instagram)' },
  { value: 'google', label: 'Google Ads' },
  { value: 'indicacao', label: 'Indicação/Boca a boca' },
  { value: 'seo', label: 'Tráfego orgânico (SEO)' },
  { value: 'social', label: 'Redes sociais orgânico' },
  { value: 'parcerias', label: 'Parcerias' },
  { value: 'eventos', label: 'Eventos/Feiras' },
  { value: 'outro', label: 'Outro' },
] as const

const segmentOptions = [
  { value: 'clinicas', label: 'Clínicas e consultórios' },
  { value: 'imobiliarias', label: 'Imobiliárias' },
  { value: 'agencias', label: 'Agências de marketing' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'cursos', label: 'Cursos e infoprodutos' },
  { value: 'servicos', label: 'Serviços profissionais' },
  { value: 'varejo', label: 'Varejo' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'beleza', label: 'Beleza e estética' },
  { value: 'outro', label: 'Outro' },
] as const

const monthlyAdSpendOptions = [
  { value: 'ate_1k', label: 'Até R$ 1.000' },
  { value: '1k_5k', label: 'R$ 1.000 - R$ 5.000' },
  { value: '5k_20k', label: 'R$ 5.000 - R$ 20.000' },
  { value: '20k_50k', label: 'R$ 20.000 - R$ 50.000' },
  { value: '50k+', label: 'Acima de R$ 50.000' },
] as const

// Componente de opção do quiz
function QuizOption({
  label,
  selected,
  onClick,
  onSelect,
}: {
  label: string
  selected: boolean
  onClick: () => void
  onSelect?: () => void
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onClick()
        onSelect?.()
      }}
      className={cn(
        'w-full rounded-lg border px-4 py-3 text-left transition-all',
        selected
          ? 'border-primary bg-primary/5 text-foreground'
          : 'border-border hover:border-primary/50'
      )}
    >
      {label}
    </button>
  )
}

// Wrapper de cada step
function StepWrapper({
  question,
  children,
  onNext,
  onBack,
  canProceed = true,
  isLast = false,
  isSubmitting = false,
  autoAdvance = false,
  nextLabel = 'Continuar',
}: {
  question: string
  children: ReactNode
  onNext?: () => void
  onBack?: () => void
  canProceed?: boolean
  isLast?: boolean
  isSubmitting?: boolean
  autoAdvance?: boolean
  nextLabel?: string
}) {
  return (
    <div className="mx-auto w-full max-w-lg">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground mb-8 flex items-center gap-1 text-sm transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </button>
      )}
      {!onBack && <div className="mb-8 h-10" />}

      <div className="space-y-8">
        <h2 className="text-2xl font-semibold md:text-3xl">{question}</h2>
        <div className="space-y-3">{children}</div>
        {onNext && !autoAdvance && (
          <Button
            type={isLast ? 'submit' : 'button'}
            onClick={isLast ? undefined : onNext}
            disabled={!canProceed || isSubmitting}
            className="h-12 w-full"
          >
            {isSubmitting ? 'Salvando...' : nextLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

// Animação de entrada
function AnimatedStep({ children }: { children: ReactNode }) {
  return <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">{children}</div>
}

interface OnboardingOverlayProps {
  onComplete: () => void
  onSkip?: () => void
}

export function OnboardingOverlay({ onComplete, onSkip }: OnboardingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false)
  const [cnpjFound, setCnpjFound] = useState(false)
  const [cnpjError, setCnpjError] = useState<string | null>(null)
  const [showCnpjConfirmation, setShowCnpjConfirmation] = useState(false)
  const [cnpjLookupState, setCnpjLookupState] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  )

  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onSubmit',
    defaultValues: {
      hasCnpj: undefined,
      cnpj: '',
      cpf: '',
      companyName: '',
      segment: '',
      // Dados da Receita Federal
      razaoSocial: '',
      nomeFantasia: '',
      cnaeCode: '',
      cnaeDescription: '',
      municipio: '',
      uf: '',
      porte: '',
      tipo: '',
      naturezaJuridica: '',
      capitalSocial: undefined,
      situacao: '',
      dataAbertura: '',
      dataSituacao: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cep: '',
      email: '',
      telefone: '',
      qsa: [],
      atividadesSecundarias: [],
      simplesOptante: false,
      simeiOptante: false,
      // Dados do onboarding
      attendantsCount: '',
      leadsPerDay: '',
      avgTicket: '',
      monthlyRevenue: '',
      mainAcquisitionChannel: '',
      monthlyAdSpend: '',
      onboardingStep: 1,
    },
  })

  const goNext = useCallback(() => {
    setCurrentStep((s) => {
      const nextStep = s + 1
      // Se tem CNPJ e está no Step 1, pula o Step 2 (dados da empresa sem CNPJ)
      if (s === 1 && form.getValues('hasCnpj') === true) {
        return 3
      }
      return Math.min(nextStep, TOTAL_STEPS)
    })
    // Reset confirmação ao avançar de step
    setShowCnpjConfirmation(false)
  }, [form])

  const goBack = useCallback(() => {
    if (showCnpjConfirmation) {
      setShowCnpjConfirmation(false)
    } else {
      setCurrentStep((s) => {
        const prevStep = s - 1
        // Se tem CNPJ e está no Step 3, volta para Step 1 (confirmação)
        if (s === 3 && form.getValues('hasCnpj') === true) {
          setShowCnpjConfirmation(true)
          return 1
        }
        return Math.max(prevStep, 1)
      })
    }
  }, [showCnpjConfirmation, form])

  const applyCnpjMask = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14)
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
    if (digits.length <= 12)
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
  }

  const applyCpfMask = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }

  const handleCnpjSearch = async () => {
    const cnpj = form.getValues('cnpj')?.replace(/\D/g, '') || ''
    if (cnpj.length !== 14) {
      setCnpjError('CNPJ deve ter 14 dígitos')
      setCnpjLookupState('error')
      return
    }
    setIsSearchingCnpj(true)
    setCnpjError(null)
    setCnpjLookupState('loading')
    try {
      const res = await fetch(`/api/v1/company/lookup-public?cnpj=${cnpj}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao buscar CNPJ')

      // Dados básicos
      form.setValue('razaoSocial', data.razaoSocial || '')
      form.setValue('nomeFantasia', data.nomeFantasia || '')
      form.setValue('cnaeCode', data.cnaeCode || '')
      form.setValue('cnaeDescription', data.cnaeDescription || '')
      form.setValue('municipio', data.municipio || '')
      form.setValue('uf', data.uf || '')
      form.setValue('porte', data.porte || '')
      form.setValue('companyName', data.nomeFantasia || data.razaoSocial)
      // Dados adicionais da Receita Federal
      form.setValue('tipo', data.tipo || '')
      form.setValue('naturezaJuridica', data.naturezaJuridica || '')
      form.setValue('capitalSocial', data.capitalSocial || undefined)
      form.setValue('situacao', data.situacao || '')
      form.setValue('dataAbertura', data.dataAbertura || '')
      form.setValue('dataSituacao', data.dataSituacao || '')
      form.setValue('logradouro', data.logradouro || '')
      form.setValue('numero', data.numero || '')
      form.setValue('complemento', data.complemento || '')
      form.setValue('bairro', data.bairro || '')
      form.setValue('cep', data.cep || '')
      form.setValue('email', data.email || '')
      form.setValue('telefone', data.telefone || '')
      form.setValue('qsa', data.qsa || [])
      form.setValue('atividadesSecundarias', data.atividadesSecundarias || [])

      setCnpjFound(true)
      setCnpjLookupState('success')
      toast.success('Dados da empresa carregados com sucesso!')
      setShowCnpjConfirmation(true)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao buscar'
      setCnpjError(errorMsg)
      setCnpjLookupState('error')
      toast.error(errorMsg)
      setCnpjFound(false)
    } finally {
      setIsSearchingCnpj(false)
    }
  }

  const resolveOrganizationId = async () => {
    const orgRes = await fetch('/api/v1/organizations/current', {
      method: 'GET',
      credentials: 'include',
    })

    if (orgRes.ok) {
      const { id } = await orgRes.json()
      if (!id) throw new Error('Organização inválida')
      return id as string
    }

    // Em casos raros de usuário órfão (sem org), cria uma organização padrão.
    if (orgRes.status !== 404) {
      throw new Error('Erro ao obter organização')
    }

    const userRes = await fetch('/api/v1/users/me', {
      method: 'GET',
      credentials: 'include',
    })

    if (!userRes.ok) {
      throw new Error('Erro ao obter usuário')
    }

    const user = await userRes.json()
    const nameFromUser =
      typeof user?.name === 'string' && user.name.trim()
        ? user.name.trim()
        : typeof user?.email === 'string'
          ? user.email.split('@')[0]
          : ''

    const fallbackName = nameFromUser || 'Minha organizacao'

    const createRes = await fetch('/api/v1/organizations', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fallbackName }),
    })

    if (!createRes.ok) {
      throw new Error('Erro ao criar organização')
    }

    const createdOrg = await createRes.json()
    if (!createdOrg?.id) {
      throw new Error('Falha ao criar organização')
    }

    return createdOrg.id as string
  }

  const handleSkip = async () => {
    try {
      const organizationId = await resolveOrganizationId()

      const response = await fetch(`/api/v1/organizations/${organizationId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboardingStatus: 'skipped',
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao pular onboarding')
      }

      toast.success('Você pode completar o cadastro depois')
      onSkip?.()
    } catch (error) {
      console.error('[onboarding] Skip error:', error)
      toast.error('Erro ao pular. Tente novamente.')
    }
  }

  const handleSubmit = async (values: OnboardingData) => {
    try {
      const organizationId = await resolveOrganizationId()

      const response = await fetch(`/api/v1/organizations/${organizationId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Dados para Organization (apenas nome)
          companyName: values.companyName,

          // Dados para OrganizationProfile (onboarding)
          cpf: !values.hasCnpj ? values.cpf?.replace(/\D/g, '') : null,
          attendantsCount: values.attendantsCount,
          avgTicket: values.avgTicket,
          leadsPerDay: values.leadsPerDay,
          monthlyRevenue: values.monthlyRevenue,
          mainAcquisitionChannel: values.mainAcquisitionChannel,
          monthlyAdSpend: values.monthlyAdSpend,
          onboardingStatus: 'completed',

          // Dados para OrganizationCompany (CNPJ/ReceitaWS)
          cnpj: values.hasCnpj ? values.cnpj?.replace(/\D/g, '') : null,
          razaoSocial: values.razaoSocial,
          nomeFantasia: values.nomeFantasia,
          cnaeCode: values.cnaeCode,
          cnaeDescription: values.cnaeDescription,
          municipio: values.municipio,
          uf: values.uf,
          porte: values.porte,
          tipo: values.tipo,
          naturezaJuridica: values.naturezaJuridica,
          capitalSocial: values.capitalSocial,
          situacao: values.situacao,
          dataAbertura: values.dataAbertura,
          dataSituacao: values.dataSituacao,
          logradouro: values.logradouro,
          numero: values.numero,
          complemento: values.complemento,
          bairro: values.bairro,
          cep: values.cep,
          email: values.email,
          telefone: values.telefone,
          qsa: values.qsa,
          atividadesSecundarias: values.atividadesSecundarias,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar onboarding')
      }

      toast.success('Cadastro completo!')
      onComplete()
    } catch (error) {
      console.error('[onboarding] Error:', error)
      toast.error('Erro ao salvar. Tente novamente.')
    }
  }

  const isSubmitting = form.formState.isSubmitting
  const mainChannel = form.watch('mainAcquisitionChannel')

  return (
    <div className="bg-background fixed inset-0 z-50">
      {/* Header */}
      <div className="bg-background/95 absolute left-0 right-0 top-0 border-b backdrop-blur">
        <div className="mx-auto w-full max-w-lg px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <img src="/images/logo_transparent.png" alt="WhaTrack" className="h-6 w-auto" />
            <div className="max-w-[200px] flex-1">
              <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
                />
              </div>
            </div>
            {onSkip && (
              <button
                type="button"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Pular
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo centralizado */}
      <div className="flex min-h-screen items-center justify-center px-4 pb-8 pt-16">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="w-full">
            {/* Step 1: CNPJ */}
            {currentStep === 1 && !showCnpjConfirmation && (
              <AnimatedStep>
                <div className="bg-primary/5 border-primary/20 mb-6 flex items-start gap-3 rounded-lg border p-4">
                  <InfoIcon className="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-foreground mb-1 font-medium">Bem-vindo ao WhaTrack!</p>
                    <p className="text-muted-foreground">
                      Responda essas 6 perguntas rápidas sobre seu negócio para personalizarmos sua
                      experiência. Leva apenas <strong>40 segundos</strong>.
                    </p>
                  </div>
                </div>
                <StepWrapper
                  question="Qual é o CNPJ da sua empresa?"
                  onNext={goNext}
                  canProceed={form.watch('hasCnpj') !== undefined}
                >
                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        placeholder="00.000.000/0000-00"
                        className="h-12 pr-10"
                        value={form.watch('cnpj') || ''}
                        onChange={(e) => {
                          const masked = applyCnpjMask(e.target.value)
                          form.setValue('cnpj', masked)
                          setCnpjFound(false)
                          setCnpjError(null)
                          setShowCnpjConfirmation(false)
                          setCnpjLookupState('idle')

                          // Buscar automaticamente quando atingir 14 dígitos
                          const digits = masked.replace(/\D/g, '')
                          if (digits.length === 14 && !isSearchingCnpj) {
                            form.setValue('hasCnpj', true)
                            setTimeout(() => {
                              handleCnpjSearch()
                            }, 0)
                          }
                        }}
                        disabled={isSearchingCnpj}
                      />

                      {/* Visual feedback */}
                      {cnpjLookupState === 'loading' && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                        </div>
                      )}
                      {cnpjLookupState === 'success' && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                      )}
                      {cnpjLookupState === 'error' && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <XCircle className="text-destructive h-4 w-4" />
                        </div>
                      )}
                    </div>
                    {cnpjError && <p className="text-destructive text-sm">{cnpjError}</p>}
                    {isSearchingCnpj && (
                      <p className="text-muted-foreground text-sm">Buscando dados da empresa...</p>
                    )}

                    <div className="border-border border-t pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          form.setValue('hasCnpj', false)
                          goNext()
                        }}
                      >
                        Não tenho CNPJ ativo
                      </Button>
                    </div>
                  </div>
                </StepWrapper>
              </AnimatedStep>
            )}

            {/* Step 1: Confirmação de CNPJ */}
            {currentStep === 1 && showCnpjConfirmation && cnpjFound && (
              <AnimatedStep>
                <StepWrapper
                  question="Confirme os dados da sua empresa"
                  onBack={goBack}
                  onNext={goNext}
                >
                  <div className="space-y-4">
                    <div className="bg-primary/5 border-primary/20 space-y-3 rounded-lg border p-4">
                      <div>
                        <p className="text-muted-foreground text-xs">Razão Social</p>
                        <p className="font-semibold">{form.watch('razaoSocial')}</p>
                      </div>
                      {form.watch('nomeFantasia') && (
                        <div>
                          <p className="text-muted-foreground text-xs">Nome Fantasia</p>
                          <p className="font-medium">{form.watch('nomeFantasia')}</p>
                        </div>
                      )}
                      <div className="border-primary/10 grid grid-cols-2 gap-3 border-t pt-2">
                        <div>
                          <p className="text-muted-foreground text-xs">Cidade/UF</p>
                          <p className="text-sm">
                            {form.watch('municipio')}/{form.watch('uf')}
                          </p>
                        </div>
                        {form.watch('porte') && (
                          <div>
                            <p className="text-muted-foreground text-xs">Porte</p>
                            <p className="text-sm">{form.watch('porte')}</p>
                          </div>
                        )}
                      </div>
                      {form.watch('cnaeDescription') && (
                        <div className="border-primary/10 border-t pt-2">
                          <p className="text-muted-foreground text-xs">Atividade Principal</p>
                          <p className="text-sm">{form.watch('cnaeDescription')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </StepWrapper>
              </AnimatedStep>
            )}

            {/* Step 2: Dados da Empresa (apenas sem CNPJ) */}
            {currentStep === 2 && !form.watch('hasCnpj') && (
              <AnimatedStep>
                <StepWrapper
                  question="Dados da empresa"
                  onBack={goBack}
                  onNext={goNext}
                  canProceed={
                    !!form.watch('cpf') && !!form.watch('companyName') && !!form.watch('segment')
                  }
                >
                  <div className="space-y-4">
                    <Controller
                      control={form.control}
                      name="cpf"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>CPF *</FieldLabel>
                          <Input
                            id={field.name}
                            placeholder="000.000.000-00"
                            className="h-12"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(applyCpfMask(e.target.value))}
                          />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    <Controller
                      control={form.control}
                      name="companyName"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>Nome da Empresa *</FieldLabel>
                          <p className="text-muted-foreground mb-2 text-xs">
                            Como sua empresa aparecerá nos relatórios e documentos
                          </p>
                          <Input
                            id={field.name}
                            placeholder="Nome da empresa"
                            className="h-12"
                            {...field}
                            value={field.value || ''}
                          />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    <Controller
                      control={form.control}
                      name="segment"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>Área de Atuação *</FieldLabel>
                          <select
                            id={field.name}
                            className="border-border bg-background h-12 w-full rounded-lg border px-3"
                            {...field}
                            value={field.value || ''}
                          >
                            <option value="">Selecione a área de atuação</option>
                            {segmentOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </div>
                </StepWrapper>
              </AnimatedStep>
            )}

            {/* Step 3: Atendentes */}
            {currentStep === 3 && (
              <AnimatedStep>
                <StepWrapper
                  question="Quantas pessoas atendem no seu time?"
                  onBack={goBack}
                  onNext={goNext}
                  autoAdvance
                >
                  <p className="text-muted-foreground mb-4 text-sm">
                    Incluindo você e todos que conversam com clientes via WhatsApp
                  </p>
                  <div className="space-y-2">
                    {attendantsOptions.map((opt) => (
                      <QuizOption
                        key={opt.value}
                        label={opt.label}
                        selected={form.watch('attendantsCount') === opt.value}
                        onClick={() => form.setValue('attendantsCount', opt.value)}
                        onSelect={goNext}
                      />
                    ))}
                  </div>
                </StepWrapper>
              </AnimatedStep>
            )}

            {/* Step 4: Leads por dia */}
            {currentStep === 4 && (
              <AnimatedStep>
                <StepWrapper
                  question="Quantos leads você recebe por dia em média?"
                  onBack={goBack}
                  onNext={goNext}
                  autoAdvance
                >
                  <p className="text-muted-foreground mb-4 text-sm">
                    Estimativa aproximada está ótima! Isso nos ajuda a dimensionar melhor sua conta
                  </p>
                  <div className="space-y-2">
                    {leadsPerDayOptions.map((opt) => (
                      <QuizOption
                        key={opt.value}
                        label={opt.label}
                        selected={form.watch('leadsPerDay') === opt.value}
                        onClick={() => form.setValue('leadsPerDay', opt.value)}
                        onSelect={goNext}
                      />
                    ))}
                  </div>
                </StepWrapper>
              </AnimatedStep>
            )}

            {/* Step 5: Ticket médio */}
            {currentStep === 5 && (
              <AnimatedStep>
                <StepWrapper
                  question="Qual seu ticket médio?"
                  onBack={goBack}
                  onNext={goNext}
                  autoAdvance
                >
                  <div className="space-y-2">
                    {avgTicketOptions.map((opt) => (
                      <QuizOption
                        key={opt.value}
                        label={opt.label}
                        selected={form.watch('avgTicket') === opt.value}
                        onClick={() => form.setValue('avgTicket', opt.value)}
                        onSelect={goNext}
                      />
                    ))}
                  </div>
                </StepWrapper>
              </AnimatedStep>
            )}

            {/* Step 6: Faturamento */}
            {currentStep === 6 && (
              <AnimatedStep>
                <StepWrapper
                  question="Qual seu faturamento mensal aproximado?"
                  onBack={goBack}
                  onNext={goNext}
                  autoAdvance
                >
                  <p className="text-muted-foreground mb-4 text-sm">
                    Isso nos ajuda a sugerir recursos e integrações ideais para seu porte
                  </p>
                  <div className="space-y-2">
                    {monthlyRevenueOptions.map((opt) => (
                      <QuizOption
                        key={opt.value}
                        label={opt.label}
                        selected={form.watch('monthlyRevenue') === opt.value}
                        onClick={() => form.setValue('monthlyRevenue', opt.value)}
                        onSelect={goNext}
                      />
                    ))}
                  </div>
                </StepWrapper>
              </AnimatedStep>
            )}

            {/* Step 7: Principal meio de aquisição */}
            {currentStep === 7 && (
              <AnimatedStep>
                <StepWrapper
                  question="Qual seu principal meio de aquisição?"
                  onBack={goBack}
                  onNext={() => form.handleSubmit(handleSubmit)()}
                  nextLabel="Concluir cadastro"
                  isLast
                  isSubmitting={isSubmitting}
                  canProceed={!!mainChannel}
                >
                  <div className="space-y-2">
                    {acquisitionChannelOptions.map((opt) => (
                      <QuizOption
                        key={opt.value}
                        label={opt.label}
                        selected={mainChannel === opt.value}
                        onClick={() => form.setValue('mainAcquisitionChannel', opt.value)}
                      />
                    ))}

                    {/* Pergunta condicional: gasto em anúncios */}
                    {(mainChannel === 'meta' || mainChannel === 'google') && (
                      <div className="border-border mt-6 space-y-3 border-t pt-6">
                        <p className="text-sm font-medium">
                          Quanto você investe por mês em anúncios?
                        </p>
                        <select
                          className="border-border bg-background h-10 w-full rounded-lg border px-3 text-sm"
                          value={form.watch('monthlyAdSpend') || ''}
                          onChange={(e) => form.setValue('monthlyAdSpend', e.target.value)}
                        >
                          <option value="">Selecione</option>
                          {monthlyAdSpendOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </StepWrapper>
              </AnimatedStep>
            )}
          </form>
        </Form>
      </div>
    </div>
  )
}
