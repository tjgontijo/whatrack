'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Search, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCnpj, isValidCnpjFormat, stripCnpj } from '@/lib/mask/cnpj'
import { apiFetch } from '@/lib/api-client'
import { useRequiredProjectRouteContext } from '@/hooks/project/project-route-context'
import { SettingsGroup } from './settings-group'
import { SettingsRow } from './settings-row'


type CompanyState = 'empty' | 'loading' | 'preview' | 'saved' | 'error'

interface QsaMember {
  nome: string
  qual: string
}

interface CompanyData {
  id?: string
  cnpj: string
  razaoSocial: string
  nomeFantasia?: string
  cnaeCode: string
  cnaeDescription: string
  municipio: string
  uf: string
  tipo?: string
  porte?: string
  qsa?: QsaMember[]
}



async function fetchCompanyData(orgId: string): Promise<CompanyData | null> {
  try {
    const data = await apiFetch('/api/v1/company', {
      orgId,
    })
    return data as CompanyData
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) return null
    throw err
  }
}

async function lookupCnpj(cnpj: string, orgId: string): Promise<CompanyData> {
  const cleanCnpj = stripCnpj(cnpj)
  const data = await apiFetch(`/api/v1/company/lookup?cnpj=${cleanCnpj}`, {
    orgId,
  })

  return data as CompanyData
}

async function saveCompanyData(
  data: CompanyData & { authorized: boolean },
  orgId: string
): Promise<CompanyData> {
  const result = await apiFetch('/api/v1/company', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    orgId,
  })

  return result as CompanyData
}

function CompanyDataRows({ data }: { data: CompanyData }) {
  return (
    <>
      <SettingsRow label="CNPJ" description="Registro principal vinculado ao workspace.">
        <p className="font-medium">{formatCnpj(data.cnpj)}</p>
      </SettingsRow>

      <SettingsRow label="Tipo / Situação" description="Classificação fiscal retornada na consulta.">
        <p className="font-medium">{data.tipo || '-'}</p>
      </SettingsRow>

      <SettingsRow label="Razão social" description="Nome jurídico oficial da empresa.">
        <p className="font-medium">{data.razaoSocial}</p>
      </SettingsRow>

      {data.nomeFantasia ? (
        <SettingsRow label="Nome fantasia" description="Nome comercial usado publicamente.">
          <p className="font-medium">{data.nomeFantasia}</p>
        </SettingsRow>
      ) : null}

      <SettingsRow label="Localização" description="Cidade e estado do cadastro principal.">
        <p className="font-medium">
          {data.municipio} / {data.uf}
        </p>
      </SettingsRow>

      <SettingsRow label="Porte" description="Porte da empresa conforme a base consultada.">
        <p className="font-medium">{data.porte || '-'}</p>
      </SettingsRow>

      <SettingsRow label="Atividade principal" description="CNAE principal retornado na consulta.">
        <p className="text-sm">
          <span className="font-medium">{data.cnaeCode}</span>
          {' - '}
          {data.cnaeDescription}
        </p>
      </SettingsRow>

      {data.qsa && data.qsa.length > 0 ? (
        <SettingsRow label="Quadro societário" description="Sócios e qualificações cadastradas.">
          <div className="space-y-2">
            {data.qsa.map((socio, index) => (
              <div
                key={index}
                className="flex items-center justify-between border-b pb-2 text-sm last:border-0 last:pb-0"
              >
                <span className="font-medium">{socio.nome}</span>
                <span className="text-muted-foreground text-xs">{socio.qual}</span>
              </div>
            ))}
          </div>
        </SettingsRow>
      ) : null}
    </>
  )
}


type CompanyDataSectionProps = {
  initialData?: CompanyData | null
}

export function CompanyDataSection({ initialData }: CompanyDataSectionProps = {}) {
  const { organizationId } = useRequiredProjectRouteContext()
  const queryClient = useQueryClient()
  const [cnpjInput, setCnpjInput] = useState('')
  const [previewData, setPreviewData] = useState<CompanyData | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Query para carregar dados salvos
  const { data: savedData, isLoading: isLoadingSaved } = useQuery({
    queryKey: ['company', organizationId],
    queryFn: () => fetchCompanyData(organizationId!),
    enabled: !!organizationId,
    initialData: initialData ?? undefined,
    staleTime: 30_000,
  })

  // Mutation para buscar CNPJ
  const lookupMutation = useMutation({
    mutationFn: (cnpj: string) => lookupCnpj(cnpj, organizationId!),
    onSuccess: (data) => {
      setPreviewData(data)
      setErrorMessage(null)
      setAuthorized(false)
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
      setPreviewData(null)
    },
  })

  // Mutation para salvar
  const saveMutation = useMutation({
    mutationFn: (data: CompanyData & { authorized: boolean }) =>
      saveCompanyData(data, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', organizationId] })
      setPreviewData(null)
      setCnpjInput('')
      setAuthorized(false)
      toast.success('Dados da empresa salvos com sucesso')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Determina o estado atual
  const getState = useCallback((): CompanyState => {
    if (isLoadingSaved) return 'loading'
    if (errorMessage) return 'error'
    if (savedData) return 'saved'
    if (previewData) return 'preview'
    return 'empty'
  }, [isLoadingSaved, errorMessage, savedData, previewData])

  const state = getState()

  // Handler para input de CNPJ com máscara
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formatted = formatCnpj(value)
    setCnpjInput(formatted)
    setErrorMessage(null)
  }

  // Handler para buscar
  const handleLookup = () => {
    if (!isValidCnpjFormat(cnpjInput)) return
    lookupMutation.mutate(cnpjInput)
  }

  // Handler para salvar
  const handleSave = () => {
    if (!previewData || !authorized) return
    saveMutation.mutate({
      ...previewData,
      authorized,
    })
  }

  // Limpa preview quando há dados salvos
  // Removido useEffect: o cleanup do preview já é feito no onSuccess da mutation de save


  const isValidCnpj = isValidCnpjFormat(cnpjInput)
  const isSearching = lookupMutation.isPending
  const isSaving = saveMutation.isPending

  return (
    <SettingsGroup
      label="Dados fiscais"
      description="Vincule os dados oficiais da empresa via Receita Federal para emissão de notas fiscais e adequação à LGPD."
      footer={
        state === 'preview' && previewData ? (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPreviewData(null)
                setCnpjInput('')
                setAuthorized(false)
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={!authorized || isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar dados
            </Button>
          </div>
        ) : undefined
      }
    >
      {state === 'loading' && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      )}

      {state === 'saved' && savedData && (
        <>
          <div className="py-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Dados da empresa vinculados com sucesso
              </AlertDescription>
            </Alert>
          </div>
          <CompanyDataRows data={savedData} />
        </>
      )}

      {(state === 'empty' || state === 'error') && (
        <>
          {errorMessage ? (
            <div className="py-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          <SettingsRow
            label="CNPJ"
            description="Busque os dados oficiais da empresa antes de vincular ao workspace."
          >
            <div className="flex flex-col gap-2 md:flex-row">
              <Input
                placeholder="Digite o CNPJ"
                value={cnpjInput}
                onChange={handleCnpjChange}
                className="md:max-w-sm"
                maxLength={18}
              />
              <Button type="button" onClick={handleLookup} disabled={!isValidCnpj || isSearching}>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2">Buscar</span>
              </Button>
            </div>
          </SettingsRow>
        </>
      )}

      {state === 'preview' && previewData && (
        <>
          <CompanyDataRows data={previewData} />
          <SettingsRow
            label="Autorização"
            description="Confirme que você está autorizado a vincular estes dados à organização."
          >
            <div className="bg-muted/10 flex items-start space-x-3 rounded-lg border p-4">
              <Checkbox
                id="authorized"
                checked={authorized}
                onCheckedChange={(checked) => setAuthorized(checked === true)}
              />
              <div className="mt-[-2px] space-y-1">
                <Label htmlFor="authorized" className="cursor-pointer font-medium">
                  Autorizo a consulta de dados
                </Label>
                <p className="text-muted-foreground text-sm">
                  Declaro que estou autorizado a consultar e vincular os dados desta empresa à
                  minha organização, conforme a Lei Geral de Proteção de Dados (LGPD).
                </p>
              </div>
            </div>
          </SettingsRow>
        </>
      )}
    </SettingsGroup>
  )
}
