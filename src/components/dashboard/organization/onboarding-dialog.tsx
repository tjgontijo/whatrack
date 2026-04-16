'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, Building2, CheckCircle2, Loader2, UserRound } from 'lucide-react'
import { toast } from 'sonner'

import { apiFetch } from '@/lib/api-client'
import { authClient } from '@/lib/auth/auth-client'
import { validateDocumentByType } from '@/lib/document/document-identity'
import { applyCpfCnpjMask, stripCpfCnpj } from '@/lib/mask/cpf-cnpj'
import {
  applyWhatsAppMask,
  removeWhatsAppMask,
  validateWhatsApp,
  WHATSAPP_MASK_MAX_LENGTH,
} from '@/lib/mask/phone-mask'
import type { CompanyLookupData } from '@/schemas/organizations/organization-onboarding'
import type { UpdateOrganizationInput } from '@/schemas/organizations/organization-schemas'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Step = 'type-select' | 'individual' | 'company' | 'phone'
type EntityType = 'individual' | 'company'
type OnboardingDialogMode = 'create' | 'edit'

type CreateOrgResponse = {
  id?: string
  organizationId?: string
  error?: string
}

type OnboardingDialogOrganization = {
  id: string
  name: string
  organizationType: 'pessoa_fisica' | 'pessoa_juridica' | null
  documentType: 'cpf' | 'cnpj' | null
  documentNumber: string | null
  legalName?: string | null
  tradeName?: string | null
  taxStatus?: string | null
  city?: string | null
  state?: string | null
}

type OnboardingDialogProps = {
  open: boolean
  mode?: OnboardingDialogMode
  onOpenChange?: (open: boolean) => void
  onCompleted?: () => void
  initialOrganization?: OnboardingDialogOrganization | null
}

function getEntityTypeFromOrganizationType(
  organizationType: OnboardingDialogOrganization['organizationType']
): EntityType | null {
  if (organizationType === 'pessoa_fisica') return 'individual'
  if (organizationType === 'pessoa_juridica') return 'company'
  return null
}

function buildInitialCompanyLookupData(
  organization?: OnboardingDialogOrganization | null
): CompanyLookupData | null {
  if (
    organization?.organizationType !== 'pessoa_juridica' ||
    organization.documentType !== 'cnpj' ||
    !organization.documentNumber
  ) {
    return null
  }

  return {
    cnpj: organization.documentNumber,
    razaoSocial: organization.legalName?.trim() || organization.name,
    ...(organization.tradeName ? { nomeFantasia: organization.tradeName } : {}),
    ...(organization.city ? { municipio: organization.city } : {}),
    ...(organization.state ? { uf: organization.state } : {}),
    ...(organization.taxStatus ? { situacao: organization.taxStatus } : {}),
  }
}

function getInitialStep(mode: OnboardingDialogMode, entityType: EntityType | null): Step {
  if (mode === 'edit') {
    if (entityType === 'individual') return 'individual'
    if (entityType === 'company') return 'company'
  }

  return 'type-select'
}

function getStepIndex(step: Step, isEditMode: boolean) {
  if (step === 'type-select') return 1
  if (isEditMode) return 2
  if (step === 'phone') return 3
  return 2
}

function renderProgressDots(step: Step, isEditMode: boolean) {
  const activeDots = isEditMode
    ? [true, step !== 'type-select']
    : [true, step !== 'type-select', step === 'phone']

  return (
    <div className="flex gap-1.5">
      {activeDots.map((active, index) => (
        <div
          key={index}
          className={`h-1.5 w-6 rounded-full transition-colors ${active ? 'bg-primary' : 'bg-muted'}`}
        />
      ))}
    </div>
  )
}

export function OnboardingDialog({
  open,
  mode = 'create',
  onOpenChange,
  onCompleted,
  initialOrganization,
}: OnboardingDialogProps) {
  const isEditMode = mode === 'edit'
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()

  const userName = session?.user?.name ?? ''
  const initialEntityType = getEntityTypeFromOrganizationType(
    initialOrganization?.organizationType ?? null
  )
  const initialCompanyLookupData = buildInitialCompanyLookupData(initialOrganization)
  const initialDocumentNumber = initialOrganization?.documentNumber ?? ''
  const initialCpf =
    initialOrganization?.documentType === 'cpf' && initialDocumentNumber
      ? applyCpfCnpjMask(initialDocumentNumber, 'cpf')
      : ''
  const initialCnpj =
    initialOrganization?.documentType === 'cnpj' && initialDocumentNumber
      ? applyCpfCnpjMask(initialDocumentNumber, 'cnpj')
      : ''
  const initialFullName =
    isEditMode && initialEntityType === 'individual' ? (initialOrganization?.name ?? userName) : ''

  const [step, setStep] = useState<Step>(getInitialStep(mode, initialEntityType))
  const [fullName, setFullName] = useState(initialFullName)
  const [cpf, setCpf] = useState(initialCpf)
  const [cnpj, setCnpj] = useState(initialCnpj)
  const [cnpjToFetch, setCnpjToFetch] = useState<string | null>(null)
  const [companyLookupData, setCompanyLookupData] = useState<CompanyLookupData | null>(
    initialCompanyLookupData
  )
  const [phone, setPhone] = useState('')
  const [entityTypeForPhone, setEntityTypeForPhone] = useState<EntityType | null>(null)

  const cnpjQuery = useQuery<CompanyLookupData>({
    queryKey: ['company-lookup', cnpjToFetch],
    queryFn: () =>
      apiFetch(`/api/v1/company/lookup?cnpj=${cnpjToFetch}`) as Promise<CompanyLookupData>,
    enabled: !!cnpjToFetch,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  async function invalidateOrganizationState() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'completion'] }),
      queryClient.invalidateQueries({ queryKey: ['organizations', 'me'] }),
      queryClient.invalidateQueries({ queryKey: ['organizations', 'me', initialOrganization?.id] }),
      queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'authorization'] }),
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'phone-numbers'] }),
      queryClient.invalidateQueries({ queryKey: ['meta-ads'] }),
    ])
  }

  const createOrgMutation = useMutation({
    mutationFn: (payload: object) =>
      apiFetch('/api/v1/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }) as Promise<CreateOrgResponse>,
    onSuccess: async (body) => {
      const orgId = body.id ?? body.organizationId
      if (orgId) {
        await authClient.organization.setActive({ organizationId: orgId }).catch(() => null)
      }
      await invalidateOrganizationState()
      if (onCompleted) {
        onCompleted()
        return
      }

      router.refresh()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar organização.')
    },
  })

  const updateOrganizationMutation = useMutation({
    mutationFn: (payload: UpdateOrganizationInput) => {
      if (!initialOrganization?.id) {
        throw new Error('Organização não encontrada para edição.')
      }

      return apiFetch('/api/v1/organizations/me', {
        method: 'PATCH',
        orgId: initialOrganization.id,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
    onSuccess: async () => {
      await invalidateOrganizationState()
      toast.success('Dados fiscais atualizados com sucesso.')
      onOpenChange?.(false)
      if (onCompleted) {
        onCompleted()
        return
      }

      router.refresh()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar organização.')
    },
  })

  const resolvedCompanyLookupData = cnpjQuery.data ?? companyLookupData
  const isSubmitting = isEditMode
    ? updateOrganizationMutation.isPending
    : createOrgMutation.isPending

  function handleSelectType(type: EntityType) {
    if (type === 'individual') {
      setFullName(
        initialEntityType === 'individual' ? (initialOrganization?.name ?? userName) : userName
      )
      setCpf(initialEntityType === 'individual' ? initialCpf : '')
      setStep('individual')
      return
    }

    setCnpj(initialEntityType === 'company' ? initialCnpj : '')
    setCompanyLookupData(initialEntityType === 'company' ? initialCompanyLookupData : null)
    setCnpjToFetch(null)
    setStep('company')
  }

  function handleBack() {
    if (!isEditMode && step === 'phone') {
      setStep(entityTypeForPhone === 'individual' ? 'individual' : 'company')
      setPhone('')
      return
    }

    setStep('type-select')

    if (isEditMode) {
      setFullName(initialFullName)
      setCpf(initialCpf)
      setCnpj(initialCnpj)
      setCompanyLookupData(initialCompanyLookupData)
      setCnpjToFetch(null)
      return
    }

    setCpf('')
    setFullName('')
    setCnpj('')
    setCnpjToFetch(null)
    setPhone('')
    setEntityTypeForPhone(null)
  }

  function handleMoveToPhoneStep(entityType: EntityType) {
    setEntityTypeForPhone(entityType)
    setPhone('')
    setStep('phone')
  }

  function handleCnpjChange(value: string) {
    const masked = applyCpfCnpjMask(value, 'cnpj')
    const digits = stripCpfCnpj(masked)
    const shouldReuseInitialLookup =
      initialEntityType === 'company' && digits === initialDocumentNumber

    setCnpj(masked)
    setCompanyLookupData(shouldReuseInitialLookup ? initialCompanyLookupData : null)
    setCnpjToFetch(digits.length === 14 && !shouldReuseInitialLookup ? digits : null)
  }

  function handleSubmit(entityType: EntityType) {
    if (!session?.user) {
      toast.error('Sessão inválida. Faça login novamente.')
      return
    }

    if (isEditMode) {
      if (!initialOrganization?.id) {
        toast.error('Organização não encontrada para edição.')
        return
      }

      const payload: UpdateOrganizationInput =
        entityType === 'individual'
          ? {
              name: fullName.trim(),
              organizationType: 'pessoa_fisica',
              documentType: 'cpf',
              documentNumber: stripCpfCnpj(cpf),
              companyLookupData: null,
            }
          : {
              organizationType: 'pessoa_juridica',
              documentType: 'cnpj',
              documentNumber: stripCpfCnpj(cnpj),
              ...(resolvedCompanyLookupData
                ? { companyLookupData: resolvedCompanyLookupData }
                : {}),
              ...(initialEntityType !== 'company' || stripCpfCnpj(cnpj) !== initialDocumentNumber
                ? {
                    name:
                      resolvedCompanyLookupData?.razaoSocial?.trim() ||
                      resolvedCompanyLookupData?.nomeFantasia?.trim() ||
                      initialOrganization.name,
                  }
                : {}),
            }

      updateOrganizationMutation.mutate(payload)
      return
    }

    const phoneDigits = removeWhatsAppMask(phone)
    const payload =
      entityType === 'individual'
        ? {
            entityType: 'individual',
            fullName: fullName.trim(),
            documentNumber: stripCpfCnpj(cpf),
            phone: phoneDigits,
          }
        : {
            entityType: 'company',
            documentNumber: stripCpfCnpj(cnpj),
            companyLookupData: resolvedCompanyLookupData,
            phone: phoneDigits,
          }

    createOrgMutation.mutate(payload)
  }

  const cpfDigits = stripCpfCnpj(cpf)
  const cnpjDigits = stripCpfCnpj(cnpj)
  const phoneDigits = removeWhatsAppMask(phone)
  const canSubmitPf = fullName.trim().length >= 3 && validateDocumentByType('cpf', cpfDigits)
  const canSubmitPj = validateDocumentByType('cnpj', cnpjDigits) && !!resolvedCompanyLookupData
  const canSubmitPhone = validateWhatsApp(phoneDigits)
  const stepIndex = getStepIndex(step, isEditMode)
  const totalSteps = isEditMode ? 2 : 3

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isEditMode) {
          onOpenChange?.(nextOpen)
        }
      }}
    >
      <DialogTitle className="sr-only">
        {isEditMode ? 'Editar dados fiscais' : 'Cadastro de Organização'}
      </DialogTitle>
      <DialogDescription className="sr-only">
        {isEditMode
          ? 'Atualize o cadastro fiscal da sua conta.'
          : 'Complete o cadastro da sua organização com os dados fiscais.'}
      </DialogDescription>
      <DialogContent
        className="w-full max-w-lg gap-0 overflow-hidden p-0"
        onInteractOutside={isEditMode ? undefined : (event) => event.preventDefault()}
        onEscapeKeyDown={isEditMode ? undefined : (event) => event.preventDefault()}
        showCloseButton={isEditMode}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="text-muted-foreground text-xs font-medium">
            Passo {stepIndex} de {totalSteps}
          </div>
          {renderProgressDots(step, isEditMode)}
        </div>

        {step === 'type-select' && (
          <div className="space-y-6 p-6">
            <div>
              <h2 className="text-foreground text-xl font-bold">
                {isEditMode ? 'Como deseja atualizar a conta?' : 'Como você opera?'}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {isEditMode
                  ? 'Escolha o tipo cadastral que deve ficar vinculado à conta.'
                  : 'Isso define o tipo do seu cadastro fiscal.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectType('individual')}
                className="border-border hover:border-primary hover:bg-primary/5 flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all focus-visible:outline-none focus-visible:ring-2"
              >
                <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                  <UserRound className="text-foreground h-6 w-6" />
                </div>
                <div>
                  <p className="text-foreground text-sm font-semibold">Pessoa Física</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Autônomo ou profissional liberal
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectType('company')}
                className="border-border hover:border-primary hover:bg-primary/5 flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all focus-visible:outline-none focus-visible:ring-2"
              >
                <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                  <Building2 className="text-foreground h-6 w-6" />
                </div>
                <div>
                  <p className="text-foreground text-sm font-semibold">Empresa</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    CNPJ ativo na Receita Federal
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 'individual' && (
          <div className="space-y-6 p-6">
            <div>
              <h2 className="text-foreground text-xl font-bold">Seus dados</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {isEditMode
                  ? 'Atualize o nome fiscal da conta e confirme o CPF.'
                  : 'Confirme seu nome e informe seu CPF.'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="full-name">Nome completo</Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Seu nome completo"
                  disabled={isSubmitting}
                />
                {fullName.trim().length > 0 && fullName.trim().length < 3 && (
                  <p className="text-destructive text-xs">Nome deve ter pelo menos 3 caracteres.</p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={cpf}
                  onChange={(event) => setCpf(applyCpfCnpjMask(event.target.value, 'cpf'))}
                  onKeyDown={(event) => {
                    const canContinue = isEditMode ? canSubmitPf : canSubmitPf && !isSubmitting
                    if (event.key === 'Enter' && canContinue) {
                      event.preventDefault()
                      if (isEditMode) {
                        handleSubmit('individual')
                        return
                      }

                      handleMoveToPhoneStep('individual')
                    }
                  }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  disabled={isSubmitting}
                />
                {cpfDigits.length === 11 && !validateDocumentByType('cpf', cpfDigits) && (
                  <p className="text-destructive text-xs">CPF inválido.</p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={isSubmitting}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (isEditMode) {
                    handleSubmit('individual')
                    return
                  }

                  handleMoveToPhoneStep('individual')
                }}
                disabled={!canSubmitPf || isSubmitting}
                className="gap-1.5"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditMode ? 'Salvar dados fiscais' : 'Próximo'}
              </Button>
            </div>
          </div>
        )}

        {step === 'company' && (
          <div className="space-y-6 p-6">
            <div>
              <h2 className="text-foreground text-xl font-bold">Dados da empresa</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {isEditMode
                  ? 'Informe o CNPJ para atualizar os dados automaticamente.'
                  : 'Informe o CNPJ para buscar os dados automaticamente.'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="cnpj">CNPJ</Label>
                <div className="relative">
                  <Input
                    id="cnpj"
                    value={cnpj}
                    onChange={(event) => handleCnpjChange(event.target.value)}
                    onKeyDown={(event) => {
                      const canContinue = canSubmitPj && !isSubmitting
                      if (event.key === 'Enter' && canContinue) {
                        event.preventDefault()
                        if (isEditMode) {
                          handleSubmit('company')
                          return
                        }

                        handleMoveToPhoneStep('company')
                      }
                    }}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    disabled={isSubmitting}
                    className={
                      cnpjQuery.isError
                        ? 'border-destructive focus-visible:ring-destructive'
                        : resolvedCompanyLookupData
                          ? 'border-green-500 focus-visible:ring-green-500'
                          : ''
                    }
                  />
                  {cnpjQuery.isFetching && (
                    <Loader2 className="text-muted-foreground absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
                  )}
                  {!cnpjQuery.isFetching && resolvedCompanyLookupData && (
                    <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                  )}
                  {cnpjQuery.isError && (
                    <AlertCircle className="text-destructive absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                  )}
                </div>
                {cnpjQuery.isError && (
                  <p className="text-destructive text-xs">
                    {cnpjQuery.error instanceof Error
                      ? cnpjQuery.error.message
                      : 'CNPJ não encontrado na Receita Federal.'}
                  </p>
                )}
              </div>

              {resolvedCompanyLookupData && (
                <div className="bg-muted/50 rounded-lg border p-4 text-sm">
                  <p className="text-foreground font-semibold">
                    {resolvedCompanyLookupData.razaoSocial}
                  </p>
                  {resolvedCompanyLookupData.nomeFantasia && (
                    <p className="text-muted-foreground text-xs">
                      {resolvedCompanyLookupData.nomeFantasia}
                    </p>
                  )}
                  <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    {resolvedCompanyLookupData.municipio && resolvedCompanyLookupData.uf && (
                      <span>
                        {resolvedCompanyLookupData.municipio}/{resolvedCompanyLookupData.uf}
                      </span>
                    )}
                    {resolvedCompanyLookupData.situacao && (
                      <span>Situação: {resolvedCompanyLookupData.situacao}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={isSubmitting}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (isEditMode) {
                    handleSubmit('company')
                    return
                  }

                  handleMoveToPhoneStep('company')
                }}
                disabled={!canSubmitPj || isSubmitting}
                className="gap-1.5"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditMode ? 'Salvar dados fiscais' : 'Próximo'}
              </Button>
            </div>
          </div>
        )}

        {step === 'phone' && entityTypeForPhone && !isEditMode && (
          <div className="space-y-6 p-6">
            <div>
              <h2 className="text-foreground text-xl font-bold">Telefone pessoal</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Informe seu telefone. Este será usado para comunicações da sua conta.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(event) => setPhone(applyWhatsAppMask(event.target.value))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && canSubmitPhone && !isSubmitting) {
                      event.preventDefault()
                      handleSubmit(entityTypeForPhone)
                    }
                  }}
                  placeholder="(11) 98888-8888"
                  maxLength={WHATSAPP_MASK_MAX_LENGTH}
                  disabled={isSubmitting}
                />
                {phoneDigits.length > 0 && !validateWhatsApp(phoneDigits) && (
                  <p className="text-destructive text-xs">
                    Telefone deve ter 10 ou 11 dígitos (DDD + número).
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={isSubmitting}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button
                type="button"
                onClick={() => handleSubmit(entityTypeForPhone)}
                disabled={!canSubmitPhone || isSubmitting}
                className="gap-1.5"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar minha conta
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
