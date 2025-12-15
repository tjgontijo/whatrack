'use client'

import { useState, ReactNode, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'

import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { authClient } from '@/lib/auth/auth-client'
import { signUpCompleteSchema, type SignUpCompleteData } from '@/lib/schema/sign-up'

// Componente wrapper com animação
function AnimatedStep({ children }: { children: ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {children}
    </div>
  )
}

import {
  attendantsOptions,
  leadsPerDayOptions,
  avgTicketOptions,
  monthlyRevenueOptions,
  mainChannelOptions,
  mainPainPointOptions,
  referralSourceOptions,
} from '@/lib/schema/sign-up'
import { applyWhatsAppMask } from '@/lib/mask/phone-mask'
import { cn } from '@/lib/utils'

// Total de steps do quiz (1 pergunta por tela)
const TOTAL_STEPS = 14

// Componente de opção do quiz - FORA do componente principal para evitar re-renders
function QuizOption({ label, selected, onClick, onSelect }: { label: string; selected: boolean; onClick: () => void; onSelect?: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        onClick()
        onSelect?.()
      }}
      className={cn(
        'w-full text-left px-4 py-3 rounded-lg border transition-all',
        selected
          ? 'border-primary bg-primary/5 text-foreground'
          : 'border-border hover:border-primary/50'
      )}
    >
      {label}
    </button>
  )
}

// Wrapper de cada step do quiz - FORA do componente principal
// Layout com posições fixas: botão voltar no topo, conteúdo centralizado, botão ação embaixo
function QuizWrapper({ 
  question, 
  children, 
  showBack = true,
  nextLabel = 'Continuar',
  onNext,
  onBack,
  canProceed = true,
  isLast = false,
  isSubmitting = false,
  autoAdvance = false,
}: { 
  question: string
  children: ReactNode
  showBack?: boolean
  nextLabel?: string
  onNext?: () => void
  onBack?: () => void
  canProceed?: boolean
  isLast?: boolean
  isSubmitting?: boolean
  autoAdvance?: boolean
}) {
  return (
    <div className="w-full">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </button>
      )}
      {!onBack && <div className="h-10 mb-8" />}

      <div className="space-y-8">
        <h2 className="text-2xl font-semibold">{question}</h2>
        <div className="space-y-3">{children}</div>
        {onNext && !autoAdvance && (
          <Button
            type={isLast ? 'submit' : 'button'}
            onClick={isLast ? undefined : onNext}
            disabled={!canProceed || isSubmitting}
            className="w-full h-12"
          >
            {isSubmitting ? 'Criando conta...' : nextLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

export default function SignUpPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)

  const form = useForm<SignUpCompleteData>({
    resolver: zodResolver(signUpCompleteSchema),
    mode: 'onSubmit', // Valida apenas no submit ou quando trigger() é chamado
    reValidateMode: 'onSubmit',
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      hasCnpj: undefined,
      cnpj: '',
      companyName: '',
      razaoSocial: '',
      nomeFantasia: '',
      cnaeCode: '',
      cnaeDescription: '',
      municipio: '',
      uf: '',
      porte: '',
      attendantsCount: '',
      leadsPerDay: '',
      avgTicket: '',
      monthlyRevenue: '',
      mainChannel: '',
      adPlatforms: {
        meta: false,
        google: false,
        tiktok: false,
        linkedin: false,
        youtube: false,
      },
      monthlyAdSpend: '',
      mainPainPoint: '',
      currency: 'BRL',
      timezone: 'America/Sao_Paulo',
      acceptTerms: false as unknown as true,
      referralSource: '',
    },
  })

  const [showPassword, setShowPassword] = useState(false)
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false)
  const [cnpjFound, setCnpjFound] = useState(false)
  const [cnpjError, setCnpjError] = useState<string | null>(null)
  const [showCnpjConfirmation, setShowCnpjConfirmation] = useState(false)

  const goNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }, [])
  
  const goBack = useCallback(() => {
    if (showCnpjConfirmation) {
      setShowCnpjConfirmation(false)
    } else {
      setCurrentStep((s) => Math.max(s - 1, 1))
    }
  }, [showCnpjConfirmation])

  // Auto-focus no primeiro input ao mudar de step
  useEffect(() => {
    const timer = setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('input:not([type="checkbox"]):not([disabled])')
      if (input) {
        input.focus()
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [currentStep])

  // Auto-busca de CNPJ quando preenchido com 14 dígitos
  useEffect(() => {
    const cnpj = form.getValues('cnpj')?.replace(/\D/g, '') || ''
    if (currentStep === 6 && form.watch('hasCnpj') && cnpj.length === 14 && !cnpjFound && !isSearchingCnpj) {
      handleCnpjSearch()
    }
  }, [form.watch('cnpj'), currentStep, form.watch('hasCnpj')])

  // Mostrar confirmação quando CNPJ for encontrado
  useEffect(() => {
    if (cnpjFound && currentStep === 6) {
      setShowCnpjConfirmation(true)
    }
  }, [cnpjFound])


  const handleCnpjSearch = async () => {
    const cnpj = form.getValues('cnpj')?.replace(/\D/g, '') || ''
    if (cnpj.length !== 14) {
      setCnpjError('CNPJ deve ter 14 dígitos')
      return
    }
    setIsSearchingCnpj(true)
    setCnpjError(null)
    try {
      const res = await fetch(`/api/v1/company/lookup-public?cnpj=${cnpj}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao buscar CNPJ')
      
      // Salvar todos os campos retornados pela API
      form.setValue('razaoSocial', data.razaoSocial || '')
      form.setValue('nomeFantasia', data.nomeFantasia || '')
      form.setValue('cnaeCode', data.cnaeCode || '')
      form.setValue('cnaeDescription', data.cnaeDescription || '')
      form.setValue('municipio', data.municipio || '')
      form.setValue('uf', data.uf || '')
      form.setValue('porte', data.porte || '')
      
      // Nome da empresa para exibição
      form.setValue('companyName', data.nomeFantasia || data.razaoSocial)
      
      setCnpjFound(true)
    } catch (err) {
      setCnpjError(err instanceof Error ? err.message : 'Erro ao buscar')
      setCnpjFound(false)
    } finally {
      setIsSearchingCnpj(false)
    }
  }

  const applyCnpjMask = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14)
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
  }

  // Função para gerar slug a partir do nome da empresa
  const generateSlug = (name: string): string => {
    // Remove terminologias padrão de empresas
    const cleanName = name
      .replace(/\s*(LTDA|S\.?A\.?|ME|EPP|EIRELI|S\/A|LTDA\.?|MEI|SS|SOCIEDADE SIMPLES)\.?\s*$/gi, '')
      .trim()
    
    // Converte para slug
    return cleanName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Espaços para hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .replace(/^-|-$/g, '') // Remove hífens no início/fim
  }

  const handleSubmit = async (values: SignUpCompleteData) => {
    try {
      // 1. Create user account with Better Auth
      const { data: signUpData, error: signUpError } = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
      })

      if (signUpError) {
        toast.error(signUpError.message || 'Não foi possível criar sua conta.')
        return
      }

      if (!signUpData) {
        toast.error('Falha ao criar conta. Tente novamente.')
        return
      }

      // Aguardar um pouco para garantir que a session foi sincronizada no servidor
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 2. Create organization with all collected data
      try {
        const orgName = values.nomeFantasia || values.razaoSocial || values.companyName || `${values.name} - Organização`
        // Gera slug a partir do nome fantasia ou razão social (sem LTDA/S.A)
        const slugBase = values.nomeFantasia || values.razaoSocial || values.companyName || values.name
        const slug = generateSlug(slugBase)

        const response = await fetch('/api/v1/organizations', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: orgName,
            slug,
            // Business profile data
            cnpj: values.hasCnpj ? values.cnpj?.replace(/\D/g, '') : null,
            attendantsCount: values.attendantsCount,
            avgTicket: values.avgTicket,
            mainChannel: values.mainChannel,
            currency: values.currency,
            timezone: values.timezone,
            leadsPerDay: values.leadsPerDay,
            monthlyRevenue: values.monthlyRevenue,
            adPlatforms: values.adPlatforms,
            monthlyAdSpend: values.monthlyAdSpend,
            mainPainPoint: values.mainPainPoint,
            referralSource: values.referralSource,
            // Company data from ReceitaWS
            razaoSocial: values.razaoSocial,
            nomeFantasia: values.nomeFantasia,
            cnaeCode: values.cnaeCode,
            cnaeDescription: values.cnaeDescription,
            municipio: values.municipio,
            uf: values.uf,
            porte: values.porte,
            // Mark onboarding as completed
            onboardingCompleted: true,
            onboardingCompletedAt: new Date().toISOString(),
          }),
        })

        if (!response.ok) {
          console.error('[sign-up] Failed to create organization')
        }
      } catch (orgError) {
        console.error('[sign-up] Error creating organization:', orgError)
      }

      // 3. Update user phone if provided
      if (values.phone) {
        try {
          await fetch('/api/v1/users/me', {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: values.phone }),
          })
        } catch (phoneError) {
          console.error('[sign-up] Error updating phone:', phoneError)
        }
      }

      toast.success('Conta criada com sucesso!')
      router.push('/dashboard')
    } catch (error) {
      console.error('[sign-up] erro ao criar conta', error)
      toast.error('Falha na comunicação com o servidor. Tente novamente.')
    }
  }

  const isSubmitting = form.formState.isSubmitting

  // Funções de validação e avanço para cada step (Enter para avançar)
  const stepHandlers: Record<number, () => Promise<void> | void> = {
    1: async () => { if (await form.trigger('name')) goNext() },
    2: async () => { if (await form.trigger('email')) goNext() },
    3: async () => { if (await form.trigger(['password', 'confirmPassword'])) goNext() },
    4: () => goNext(),
    5: () => goNext(),
    6: () => {
      if (form.getValues('hasCnpj') && !cnpjFound) {
        setCnpjError('Busque o CNPJ primeiro')
        return
      }
      goNext()
    },
    7: () => { if (form.getValues('attendantsCount')) goNext() },
    8: () => { if (form.getValues('leadsPerDay')) goNext() },
    9: () => { if (form.getValues('avgTicket')) goNext() },
    10: () => { if (form.getValues('monthlyRevenue')) goNext() },
    11: () => { if (form.getValues('mainChannel')) goNext() },
    12: () => { if (form.getValues('mainPainPoint')) goNext() },
    13: () => { if (form.getValues('referralSource')) goNext() },
    14: () => {
      if (form.getValues('acceptTerms')) {
        form.handleSubmit(handleSubmit)()
      }
    },
  }

  // Atalho Enter para avançar
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'Enter',
        action: () => {
          const handler = stepHandlers[currentStep]
          if (handler) handler()
        },
      },
    ],
  })

  return (
    <div className="flex min-h-screen flex-col bg-background" data-testid="sign-up-page">
      {/* Header fixo */}
      <div className="border-b bg-background">
        <div className="mx-auto w-full max-w-lg px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <img src="/images/logo_transparent.png" alt="WhaTrack" className="h-6 w-auto" />
            <div className="flex-1 max-w-[200px]">
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
                />
              </div>
            </div>
            <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Fazer Login
            </Link>
          </div>
        </div>
      </div>

      {/* Conteúdo centralizado verticalmente (considerando tela inteira) */}
      <div className="fixed inset-0 top-0 flex items-center justify-center px-4 pointer-events-none">
        <div className="w-full max-w-lg pointer-events-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              
              {/* Step 1: Nome */}
              {currentStep === 1 && (
                <AnimatedStep key="step-1">
                <QuizWrapper 
                  question="Qual é o seu nome?" 
                  showBack={false}
                  onNext={async () => {
                    const valid = await form.trigger('name')
                    if (valid) goNext()
                  }}
                  canProceed={!!form.watch('name')}
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Seu nome completo" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </QuizWrapper>
                </AnimatedStep>
              )}

              {/* Step 2: Email */}
              {currentStep === 2 && (
                <AnimatedStep key="step-2">
                <QuizWrapper 
                  question="Qual é o seu email?"
                  onBack={goBack}
                  onNext={async () => {
                    const valid = await form.trigger('email')
                    if (valid) goNext()
                  }}
                  canProceed={!!form.watch('email')}
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="email" placeholder="seu@email.com" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </QuizWrapper>
                </AnimatedStep>
              )}

              {/* Step 3: Senha */}
              {currentStep === 3 && (
                <AnimatedStep key="step-3">
                <QuizWrapper 
                  question="Crie uma senha"
                  onBack={goBack}
                  onNext={async () => {
                    const password = form.getValues('password')
                    const confirmPassword = form.getValues('confirmPassword')
                    
                    // Validar campos individuais
                    const valid = await form.trigger(['password', 'confirmPassword'])
                    
                    // Validar se as senhas são iguais
                    if (valid && password !== confirmPassword) {
                      form.setError('confirmPassword', {
                        type: 'manual',
                        message: 'As senhas não coincidem'
                      })
                      return
                    }
                    
                    if (valid) goNext()
                  }}
                  canProceed={!!form.watch('password') && !!form.watch('confirmPassword') && form.watch('password') === form.watch('confirmPassword')}
                >
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="password" placeholder="Mínimo 8 caracteres" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="password" placeholder="Confirme a senha" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </QuizWrapper>
              </AnimatedStep>
              )}

              {/* Step 4: WhatsApp */}
              {currentStep === 4 && (
                <AnimatedStep key="step-4">
                <QuizWrapper 
                  question="Qual seu WhatsApp?"
                  onBack={goBack}
                  onNext={goNext}
                  nextLabel="Continuar"
                >
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            type="tel" 
                            placeholder="(11) 99999-9999" 
                            className="h-12" 
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(applyWhatsAppMask(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-sm text-muted-foreground">Opcional, mas ajuda no suporte</p>
                </QuizWrapper>
                </AnimatedStep>
              )}

              {/* Step 5: Tem CNPJ? */}
              {currentStep === 5 && (
                <AnimatedStep key="step-5">
                <QuizWrapper 
                  question="Sua empresa tem CNPJ?"
                  onBack={goBack}
                  onNext={goNext}
                  autoAdvance
                >
                  <div className="space-y-3">
                    <QuizOption 
                      label="Sim, tenho CNPJ" 
                      selected={form.watch('hasCnpj') === true}
                      onClick={() => form.setValue('hasCnpj', true)}
                      onSelect={goNext}
                    />
                    <QuizOption 
                      label="Ainda não tenho" 
                      selected={form.watch('hasCnpj') === false}
                      onClick={() => form.setValue('hasCnpj', false)}
                      onSelect={goNext}
                    />
                  </div>
                </QuizWrapper>
                </AnimatedStep>
              )}

              {/* Step 6: CNPJ ou Nome da empresa */}
              {currentStep === 6 && !showCnpjConfirmation && (
                <AnimatedStep key="step-6">
                <QuizWrapper 
                  question={form.watch('hasCnpj') ? "Qual o CNPJ?" : "Qual o nome da empresa?"}
                  onBack={goBack}
                  onNext={goNext}
                  canProceed={form.watch('hasCnpj') ? cnpjFound : !!form.watch('companyName')}
                >
                  {form.watch('hasCnpj') ? (
                    <div className="space-y-3">
                      <Input 
                        placeholder="00.000.000/0000-00" 
                        className="h-12"
                        value={form.watch('cnpj') || ''}
                        onChange={(e) => {
                          form.setValue('cnpj', applyCnpjMask(e.target.value))
                          setCnpjFound(false)
                          setCnpjError('')
                          setShowCnpjConfirmation(false)
                        }}
                        disabled={isSearchingCnpj}
                      />
                      {cnpjError && <p className="text-sm text-destructive">{cnpjError}</p>}
                      {isSearchingCnpj && <p className="text-sm text-muted-foreground">Buscando dados da empresa...</p>}
                    </div>
                  ) : (
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Nome da sua empresa" className="h-12" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </QuizWrapper>
                </AnimatedStep>
              )}

              {/* Step 6: Confirmação de CNPJ */}
              {currentStep === 6 && showCnpjConfirmation && cnpjFound && (
                <AnimatedStep key="step-6-confirm">
                <QuizWrapper 
                  question="Confirme os dados da sua empresa"
                  onBack={goBack}
                  onNext={goNext}
                >
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Razão Social</p>
                        <p className="font-semibold">{form.watch('razaoSocial')}</p>
                      </div>
                      {form.watch('nomeFantasia') && (
                        <div>
                          <p className="text-xs text-muted-foreground">Nome Fantasia</p>
                          <p className="font-medium">{form.watch('nomeFantasia')}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-primary/10">
                        <div>
                          <p className="text-xs text-muted-foreground">Cidade/UF</p>
                          <p className="text-sm">{form.watch('municipio')}/{form.watch('uf')}</p>
                        </div>
                        {form.watch('porte') && (
                          <div>
                            <p className="text-xs text-muted-foreground">Porte</p>
                            <p className="text-sm">{form.watch('porte')}</p>
                          </div>
                        )}
                      </div>
                      {form.watch('cnaeDescription') && (
                        <div className="pt-2 border-t border-primary/10">
                          <p className="text-xs text-muted-foreground">Atividade Principal</p>
                          <p className="text-sm">{form.watch('cnaeDescription')}</p>
                        </div>
                      )}
                    </div>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        setCnpjFound(false)
                        setShowCnpjConfirmation(false)
                        form.setValue('cnpj', '')
                      }}
                      className="w-full"
                    >
                      Inserir outro CNPJ
                    </Button>
                  </div>
                </QuizWrapper>
                </AnimatedStep>
              )}

              {/* Step 7: Atendentes */}
              {currentStep === 7 && (
                <AnimatedStep key="step-7">
                <QuizWrapper 
                  question="Quantas pessoas atuam no comércial da sua empresa?"
                  onBack={goBack}
                  onNext={goNext}
                  autoAdvance
                >
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
                </QuizWrapper>
                </AnimatedStep>
              )}

              {/* Step 8: Leads por dia */}
              {currentStep === 8 && (
                <AnimatedStep key="step-8">
                <QuizWrapper 
                  question="Quantos leads você recebe por dia?"
                  onBack={goBack}
                  onNext={goNext}
                  autoAdvance
                >
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
                </QuizWrapper>
                </AnimatedStep>
              )}

              {/* Step 9: Ticket médio */}
              {currentStep === 9 && (
                <AnimatedStep key="step-9">
                <QuizWrapper 
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
                </QuizWrapper>
                </AnimatedStep>
              )}

              {/* Step 10: Faturamento */}
              {currentStep === 10 && (
                <AnimatedStep key="step-10">
                <QuizWrapper 
                  question="Qual seu faturamento mensal?"
                  onBack={goBack}
                  onNext={goNext}
                  autoAdvance
                >
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
                </QuizWrapper>
                </AnimatedStep>
              )}

              {/* Step 11: Canal principal */}
              {currentStep === 11 && (
                <AnimatedStep key="step-11">
                <QuizWrapper 
                  question="Qual seu principal canal de vendas?"
                  onBack={goBack}
                  onNext={goNext}
                  autoAdvance
                >
                  <div className="space-y-2">
                    {mainChannelOptions.map((opt) => (
                      <QuizOption 
                        key={opt.value}
                        label={opt.label} 
                        selected={form.watch('mainChannel') === opt.value}
                        onClick={() => form.setValue('mainChannel', opt.value)}
                        onSelect={goNext}
                      />
                    ))}
                  </div>
                </QuizWrapper>
                </AnimatedStep>
              )}

              {/* Step 12: Maior dor */}
              {currentStep === 12 && (
                <AnimatedStep key="step-12">
                <QuizWrapper 
                  question="Qual sua maior dor hoje?"
                  onBack={goBack}
                  onNext={goNext}
                  autoAdvance
                >
                  <div className="space-y-2">
                    {mainPainPointOptions.map((opt) => (
                      <QuizOption 
                        key={opt.value}
                        label={opt.label} 
                        selected={form.watch('mainPainPoint') === opt.value}
                        onClick={() => form.setValue('mainPainPoint', opt.value)}
                        onSelect={goNext}
                      />
                    ))}
                  </div>
                </QuizWrapper>
                </AnimatedStep>
              )}

              {/* Step 13: Como conheceu */}
              {currentStep === 13 && (
                <AnimatedStep key="step-13">
                <QuizWrapper 
                  question="Como conheceu o WhaTrack?"
                  onBack={goBack}
                  onNext={goNext}
                  autoAdvance
                >
                  <div className="space-y-2">
                    {referralSourceOptions.map((opt) => (
                      <QuizOption 
                        key={opt.value}
                        label={opt.label} 
                        selected={form.watch('referralSource') === opt.value}
                        onClick={() => form.setValue('referralSource', opt.value)}
                        onSelect={goNext}
                      />
                    ))}
                  </div>
                </QuizWrapper>
                </AnimatedStep>
              )}

              {/* Step 14: Termos */}
              {currentStep === 14 && (
                <AnimatedStep key="step-14">
                <QuizWrapper 
                  question="Quase lá!"
                  onBack={goBack}
                  onNext={() => form.handleSubmit(handleSubmit)()}
                  nextLabel="Criar minha conta"
                  isLast
                  isSubmitting={isSubmitting}
                  canProceed={form.watch('acceptTerms')}
                >
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Revise e aceite os termos para finalizar seu cadastro.
                    </p>
                    <div className="flex items-start gap-3 p-4 rounded-lg border">
                      <Checkbox
                        id="terms"
                        checked={form.watch('acceptTerms')}
                        onCheckedChange={(checked) => form.setValue('acceptTerms', checked === true ? true : false as unknown as true)}
                      />
                      <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                        Aceito os{' '}
                        <Link href="/terms" className="text-primary hover:underline" target="_blank">
                          termos de uso
                        </Link>{' '}
                        e a{' '}
                        <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                          política de privacidade
                        </Link>
                      </Label>
                    </div>
                  </div>
                </QuizWrapper>
                </AnimatedStep>
              )}
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
