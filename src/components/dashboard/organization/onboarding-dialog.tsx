'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import { Building2, UserRound, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

import { authClient } from '@/lib/auth/auth-client'
import { apiFetch } from '@/lib/api-client'
import { applyCpfCnpjMask, stripCpfCnpj } from '@/lib/mask/cpf-cnpj'
import { validateDocumentByType } from '@/lib/document/document-identity'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Step = 'type-select' | 'individual' | 'company'
type EntityType = 'individual' | 'company'

type CompanyLookupData = {
  cnpj: string
  razaoSocial: string
  nomeFantasia?: string
  cnaeCode?: string
  cnaeDescription?: string
  municipio?: string
  uf?: string
  tipo?: string
  porte?: string
  naturezaJuridica?: string
  capitalSocial?: number
  situacao?: string
  dataAbertura?: string
  dataSituacao?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  email?: string
  telefone?: string
  qsa?: Array<{ nome: string; qual: string }>
  atividadesSecundarias?: Array<{ code: string; text: string }>
}

type CreateOrgResponse = {
  id?: string
  organizationId?: string
  error?: string
}

type OnboardingDialogProps = {
  open: boolean
}

export function OnboardingDialog({ open }: OnboardingDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()

  const [step, setStep] = useState<Step>('type-select')
  const [fullName, setFullName] = useState('')
  const [cpf, setCpf] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [cnpjToFetch, setCnpjToFetch] = useState<string | null>(null)

  const userName = session?.user?.name ?? ''

  // Lookup CNPJ via TanStack Query — dispara quando cnpjToFetch tem 14 dígitos
  const cnpjQuery = useQuery<CompanyLookupData>({
    queryKey: ['company-lookup', cnpjToFetch],
    queryFn: () => apiFetch(`/api/v1/company/lookup?cnpj=${cnpjToFetch}`) as Promise<CompanyLookupData>,
    enabled: !!cnpjToFetch,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'completion'] }),
        queryClient.invalidateQueries({ queryKey: ['organizations', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'authorization'] }),
      ])
      router.refresh()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar organização.')
    },
  })

  function handleSelectType(type: EntityType) {
    if (type === 'individual') {
      setFullName(userName)
      setStep('individual')
    } else {
      setStep('company')
    }
  }

  function handleBack() {
    setStep('type-select')
    setCpf('')
    setFullName('')
    setCnpj('')
    setCnpjToFetch(null)
  }

  function handleCnpjChange(value: string) {
    const masked = applyCpfCnpjMask(value, 'cnpj')
    setCnpj(masked)
    const digits = stripCpfCnpj(masked)
    setCnpjToFetch(digits.length === 14 ? digits : null)
  }

  function handleSubmit(entityType: EntityType) {
    if (!session?.user) {
      toast.error('Sessão inválida. Faça login novamente.')
      return
    }

    const payload =
      entityType === 'individual'
        ? { entityType: 'individual', documentNumber: stripCpfCnpj(cpf) }
        : {
            entityType: 'company',
            documentNumber: stripCpfCnpj(cnpj),
            companyLookupData: cnpjQuery.data,
          }

    createOrgMutation.mutate(payload)
  }

  const cpfDigits = stripCpfCnpj(cpf)
  const canSubmitPf = fullName.trim().length >= 3 && validateDocumentByType('cpf', cpfDigits)
  const canSubmitPj = cnpjQuery.isSuccess && !!cnpjQuery.data
  const isSubmitting = createOrgMutation.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        /* bloqueante — não fecha */
      }}
    >
      <DialogTitle asChild>
        <VisuallyHidden>Cadastro de Organização</VisuallyHidden>
      </DialogTitle>
      <DialogContent
        className="w-full max-w-lg gap-0 overflow-hidden p-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        {/* Indicador de progresso */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="text-muted-foreground text-xs font-medium">
            {step === 'type-select' ? 'Passo 1 de 2' : 'Passo 2 de 2'}
          </div>
          <div className="flex gap-1.5">
            <div className="bg-primary h-1.5 w-6 rounded-full" />
            <div
              className={`h-1.5 w-6 rounded-full transition-colors ${
                step !== 'type-select' ? 'bg-primary' : 'bg-muted'
              }`}
            />
          </div>
        </div>

        {/* Passo 1: seleção de tipo */}
        {step === 'type-select' && (
          <div className="space-y-6 p-6">
            <div>
              <h2 className="text-foreground text-xl font-bold">Como você opera?</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Isso define o tipo do seu cadastro fiscal.
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

        {/* Passo 2A: Pessoa Física */}
        {step === 'individual' && (
          <div className="space-y-6 p-6">
            <div>
              <h2 className="text-foreground text-xl font-bold">Seus dados</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Confirme seu nome e informe seu CPF.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="full-name">Nome completo</Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
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
                  onChange={(e) => setCpf(applyCpfCnpjMask(e.target.value, 'cpf'))}
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
                onClick={() => handleSubmit('individual')}
                disabled={!canSubmitPf || isSubmitting}
                className="gap-1.5"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar minha conta
              </Button>
            </div>
          </div>
        )}

        {/* Passo 2B: Pessoa Jurídica */}
        {step === 'company' && (
          <div className="space-y-6 p-6">
            <div>
              <h2 className="text-foreground text-xl font-bold">Dados da empresa</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Informe o CNPJ para buscar os dados automaticamente.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="cnpj">CNPJ</Label>
                <div className="relative">
                  <Input
                    id="cnpj"
                    value={cnpj}
                    onChange={(e) => handleCnpjChange(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    disabled={isSubmitting}
                    className={
                      cnpjQuery.isError
                        ? 'border-destructive focus-visible:ring-destructive'
                        : cnpjQuery.isSuccess
                          ? 'border-green-500 focus-visible:ring-green-500'
                          : ''
                    }
                  />
                  {cnpjQuery.isFetching && (
                    <Loader2 className="text-muted-foreground absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
                  )}
                  {cnpjQuery.isSuccess && (
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

              {cnpjQuery.isSuccess && cnpjQuery.data && (
                <div className="bg-muted/50 rounded-lg border p-4 text-sm">
                  <p className="text-foreground font-semibold">{cnpjQuery.data.razaoSocial}</p>
                  {cnpjQuery.data.nomeFantasia && (
                    <p className="text-muted-foreground text-xs">{cnpjQuery.data.nomeFantasia}</p>
                  )}
                  <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    {cnpjQuery.data.municipio && cnpjQuery.data.uf && (
                      <span>
                        {cnpjQuery.data.municipio}/{cnpjQuery.data.uf}
                      </span>
                    )}
                    {cnpjQuery.data.situacao && (
                      <span>Situação: {cnpjQuery.data.situacao}</span>
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
                onClick={() => handleSubmit('company')}
                disabled={!canSubmitPj || isSubmitting}
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
