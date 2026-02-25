'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { authClient } from '@/lib/auth/auth-client'
import { applyCpfCnpjMask, stripCpfCnpj } from '@/lib/mask/cpf-cnpj'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

export default function OrganizationOnboardingPage() {
  const router = useRouter()
  const { data: session, isPending: loadingSession } = authClient.useSession()

  const [entityType, setEntityType] = useState<EntityType>('individual')
  const [documentNumber, setDocumentNumber] = useState('')
  const [companyLookupData, setCompanyLookupData] = useState<CompanyLookupData | null>(null)
  const [isLookingUpCompany, setIsLookingUpCompany] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!loadingSession && !session) {
      router.replace('/sign-in')
    }
  }, [loadingSession, router, session])

  const documentType = entityType === 'company' ? 'cnpj' : 'cpf'
  const documentLabel = entityType === 'company' ? 'CNPJ' : 'CPF'
  const normalizedDocument = stripCpfCnpj(documentNumber)
  const isCompanyLookupReady = entityType === 'company' && normalizedDocument.length === 14

  const profileName = useMemo(() => {
    if (entityType === 'individual') {
      return session?.user?.name || 'Usuário'
    }

    if (!companyLookupData) {
      return 'Consulte o CNPJ para preencher os dados da empresa.'
    }

    return (
      companyLookupData.razaoSocial ||
      companyLookupData.nomeFantasia ||
      'Empresa sem razão social retornada'
    )
  }, [companyLookupData, entityType, session?.user?.name])

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
      toast.error(error instanceof Error ? error.message : 'Erro ao consultar CNPJ.')
      setCompanyLookupData(null)
    } finally {
      setIsLookingUpCompany(false)
    }
  }

  async function handleSubmit() {
    if (!session?.user) return

    if (!normalizedDocument) {
      toast.error(`Informe um ${documentLabel} válido.`)
      return
    }

    if (entityType === 'company' && !companyLookupData) {
      toast.error('Consulte o CNPJ antes de continuar.')
      return
    }

    setIsSubmitting(true)
    try {
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
          router.push('/dashboard')
          return
        }

        throw new Error(body?.error || 'Não foi possível criar a organização.')
      }

      if (body?.id) {
        await authClient.organization.setActive({ organizationId: body.id }).catch(() => null)
      }

      toast.success('Organização criada com sucesso!')
      router.push('/dashboard')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao finalizar onboarding.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadingSession || !session) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Configurar Organização</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Defina se sua conta é PF ou PJ para habilitar os módulos de integração.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identidade da Organização</CardTitle>
          <CardDescription>
            Os módulos de WhatsApp e Meta Ads são liberados após concluir este cadastro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:w-[280px]">
            <Label htmlFor="entity-type">Tipo</Label>
            <Select
              value={entityType}
              onValueChange={(value: EntityType) => {
                setEntityType(value)
                setDocumentNumber('')
                setCompanyLookupData(null)
              }}
            >
              <SelectTrigger id="entity-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Pessoa Física</SelectItem>
                <SelectItem value="company">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 md:max-w-[420px]">
            <Label htmlFor="document-number">{documentLabel}</Label>
            <Input
              id="document-number"
              value={documentNumber}
              maxLength={entityType === 'company' ? 18 : 14}
              placeholder={entityType === 'company' ? '00.000.000/0000-00' : '000.000.000-00'}
              onChange={(event) =>
                setDocumentNumber(applyCpfCnpjMask(event.target.value, documentType))
              }
            />
          </div>

          {entityType === 'company' && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleLookupCompany()}
                disabled={isLookingUpCompany || !isCompanyLookupReady}
              >
                {isLookingUpCompany ? 'Consultando...' : 'Consultar CNPJ na Receita'}
              </Button>
            </div>
          )}

          <div className="bg-muted/30 rounded-md border p-3 text-sm">
            <p className="font-medium">Nome da organização</p>
            <p className="text-muted-foreground">
              {entityType === 'individual'
                ? `Será usado o nome do usuário: ${profileName}`
                : profileName}
            </p>
          </div>

          <div>
            <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Concluir cadastro da organização'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
