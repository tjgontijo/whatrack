'use client'

import { type ReactNode, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Building2, Loader2, UserRound, X } from 'lucide-react'
import { toast } from 'sonner'

import { authClient } from '@/lib/auth/auth-client'
import { useIsMobile } from '@/hooks/ui/use-mobile'
import { applyCpfCnpjMask, stripCpfCnpj } from '@/lib/mask/cpf-cnpj'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type EntityType = 'individual' | 'company'
type DocumentType = 'cpf' | 'cnpj'

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

type OrganizationIdentityDrawerProps = {
  hasOrganization: boolean
  trigger: ReactNode
  onCompleted?: () => void
}

export function OrganizationIdentityDrawer({
  hasOrganization,
  trigger,
  onCompleted,
}: OrganizationIdentityDrawerProps) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()

  const [open, setOpen] = useState(false)
  const [entityType, setEntityType] = useState<EntityType>('individual')
  const [documentNumber, setDocumentNumber] = useState('')
  const [companyLookupData, setCompanyLookupData] = useState<CompanyLookupData | null>(null)
  const [isLookingUpCompany, setIsLookingUpCompany] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const documentType: DocumentType = entityType === 'company' ? 'cnpj' : 'cpf'
  const normalizedDocument = stripCpfCnpj(documentNumber)
  const isCompanyLookupReady = entityType === 'company' && normalizedDocument.length === 14

  const profileName = useMemo(() => {
    if (entityType === 'individual') {
      return session?.user?.name || 'Usuário'
    }

    if (!companyLookupData) {
      return 'Consulte o CNPJ para buscar os dados da empresa.'
    }

    return companyLookupData.razaoSocial || companyLookupData.nomeFantasia || 'Empresa sem nome'
  }, [companyLookupData, entityType, session?.user?.name])

  const canSubmit = useMemo(() => {
    if (entityType === 'company') {
      return normalizedDocument.length === 14 && !!companyLookupData
    }
    return normalizedDocument.length === 11
  }, [companyLookupData, entityType, normalizedDocument.length])

  const resetForm = () => {
    setEntityType('individual')
    setDocumentNumber('')
    setCompanyLookupData(null)
    setIsLookingUpCompany(false)
    setIsSubmitting(false)
  }

  async function handleLookupCompany() {
    if (!isCompanyLookupReady) {
      toast.error('Informe um CNPJ válido para consultar.')
      return
    }

    setIsLookingUpCompany(true)
    try {
      const response = await fetch(`/api/v1/company/lookup?cnpj=${normalizedDocument}`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error || 'Não foi possível consultar o CNPJ.')
      }

      const payload = (await response.json()) as CompanyLookupData
      setCompanyLookupData(payload)
      toast.success('Dados da Receita carregados.')
    } catch (error) {
      setCompanyLookupData(null)
      toast.error(error instanceof Error ? error.message : 'Erro ao consultar CNPJ.')
    } finally {
      setIsLookingUpCompany(false)
    }
  }

  async function handleSubmit() {
    if (!session?.user) {
      toast.error('Sessão inválida. Faça login novamente.')
      return
    }

    if (!canSubmit) {
      toast.error(entityType === 'company' ? 'Consulte o CNPJ antes de salvar.' : 'Informe um CPF válido.')
      return
    }

    setIsSubmitting(true)
    try {
      if (hasOrganization) {
        const response = await fetch('/api/v1/organizations/me', {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            teamType: entityType === 'company' ? 'pessoa_juridica' : 'pessoa_fisica',
            documentType,
            documentNumber: normalizedDocument,
          }),
        })

        const body = (await response.json().catch(() => null)) as { error?: string } | null
        if (!response.ok) {
          throw new Error(body?.error || 'Não foi possível atualizar os dados da organização.')
        }
      } else {
        const response = await fetch('/api/v1/organizations', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entityType,
            documentNumber: normalizedDocument,
            ...(entityType === 'company' ? { companyLookupData } : {}),
          }),
        })

        const body = (await response.json().catch(() => null)) as
          | { id?: string; error?: string; organizationId?: string }
          | null

        if (!response.ok) {
          if (response.status === 409 && body?.organizationId) {
            await authClient.organization
              .setActive({ organizationId: body.organizationId })
              .catch(() => null)
          } else {
            throw new Error(body?.error || 'Não foi possível criar a organização.')
          }
        } else if (body?.id) {
          await authClient.organization.setActive({ organizationId: body.id }).catch(() => null)
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'completion'] }),
        queryClient.invalidateQueries({ queryKey: ['organizations', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['organizations', 'me', 'authorization'] }),
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'phone-numbers'] }),
        queryClient.invalidateQueries({ queryKey: ['meta-ads'] }),
      ])

      toast.success('Dados da organização atualizados com sucesso.')
      setOpen(false)
      onCompleted?.()
      router.refresh()
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar os dados da organização.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formContent = (
    <>
      <div className="space-y-4 overflow-y-auto px-6 py-5">
        <div className="grid gap-2">
          <Label htmlFor="organization-entity-type">Tipo</Label>
          <Select
            value={entityType}
            onValueChange={(value: EntityType) => {
              setEntityType(value)
              setDocumentNumber('')
              setCompanyLookupData(null)
            }}
          >
            <SelectTrigger id="organization-entity-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Pessoa Física</SelectItem>
              <SelectItem value="company">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="organization-document">{documentType === 'cnpj' ? 'CNPJ' : 'CPF'}</Label>
          <Input
            id="organization-document"
            value={documentNumber}
            maxLength={documentType === 'cnpj' ? 18 : 14}
            placeholder={documentType === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
            onChange={(event) => setDocumentNumber(applyCpfCnpjMask(event.target.value, documentType))}
          />
        </div>

        {entityType === 'company' ? (
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleLookupCompany()}
              disabled={isLookingUpCompany || !isCompanyLookupReady}
              className="w-full"
            >
              {isLookingUpCompany ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Consultando Receita...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  Consultar CNPJ na Receita
                </>
              )}
            </Button>

            <Alert className="border-muted">
              <Building2 className="h-4 w-4" />
              <AlertDescription>
                {companyLookupData
                  ? `Empresa identificada: ${profileName}`
                  : 'Após consultar o CNPJ, os dados da empresa serão usados no cadastro.'}
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <Alert className="border-muted">
            <UserRound className="h-4 w-4" />
            <AlertDescription>
              O nome do titular será usado a partir do usuário cadastrado: <strong>{profileName}</strong>.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="border-t px-6 pb-6 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : hasOrganization ? (
              'Salvar'
            ) : (
              'Criar organização'
            )}
          </Button>
          {isMobile ? (
            <DrawerClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancelar
              </Button>
            </DrawerClose>
          ) : (
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancelar
              </Button>
            </SheetClose>
          )}
        </div>
      </div>
    </>
  )

  if (!isMobile) {
    return (
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) resetForm()
        }}
      >
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="h-[100dvh] border-none p-0 data-[side=right]:!w-[min(94vw,760px)] data-[side=right]:sm:!max-w-none"
        >
          <div className="ml-auto flex h-full w-full max-w-[720px] flex-col overflow-hidden">
            <div className="shrink-0 border-b px-6 pb-4 pt-6 text-left">
              <div className="flex w-full items-start justify-between">
                <div className="min-w-0">
                  <SheetTitle className="truncate text-2xl font-bold leading-tight tracking-tight">
                    Completar dados da organização
                  </SheetTitle>
                  <SheetDescription className="text-muted-foreground mt-1 text-left text-sm">
                    Informe o tipo e o documento fiscal da organização.
                  </SheetDescription>
                </div>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <X className="h-5 w-5" />
                  </Button>
                </SheetClose>
              </div>
            </div>

            {formContent}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) resetForm()
      }}
      shouldScaleBackground={false}
      direction="bottom"
    >
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>

      <DrawerContent className="bg-background h-[100dvh] max-h-none rounded-none border-none data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-none">
        <div className="mx-auto flex h-full w-full max-w-[720px] flex-col overflow-hidden">
          <DrawerHeader className="shrink-0 border-b px-6 pb-4 pt-6 text-left">
            <div className="flex w-full items-start justify-between">
              <div className="min-w-0">
                <DrawerTitle className="truncate text-2xl font-bold leading-tight tracking-tight">
                  Completar dados da organização
                </DrawerTitle>
                <DrawerDescription className="text-muted-foreground mt-1 text-left text-sm">
                  Informe o tipo e o documento fiscal da organização.
                </DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          {formContent}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
