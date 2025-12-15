'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Search, Building2, AlertCircle, CheckCircle2, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCnpj, isValidCnpjFormat, stripCnpj } from '@/lib/mask/cnpj'
import { ORGANIZATION_HEADER } from '@/lib/constants'
import { authClient } from '@/lib/auth/auth-client'

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
  const response = await fetch('/api/v1/company', {
    headers: { [ORGANIZATION_HEADER]: orgId },
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error('Erro ao carregar dados da empresa')
  }

  return response.json()
}

async function lookupCnpj(cnpj: string, orgId: string): Promise<CompanyData> {
  const cleanCnpj = stripCnpj(cnpj)
  const response = await fetch(`/api/v1/company/lookup?cnpj=${cleanCnpj}`, {
    headers: { [ORGANIZATION_HEADER]: orgId },
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Erro ao buscar CNPJ')
  }

  return response.json()
}

async function saveCompanyData(data: CompanyData & { authorized: boolean }, orgId: string): Promise<CompanyData> {
  const response = await fetch('/api/v1/company', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [ORGANIZATION_HEADER]: orgId,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Erro ao salvar empresa')
  }

  return response.json()
}

export function CompanyDataSection() {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const organizationId = activeOrg?.id
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
  useEffect(() => {
    if (savedData) {
      setPreviewData(null)
      setCnpjInput('')
    }
  }, [savedData])

  const isValidCnpj = isValidCnpjFormat(cnpjInput)
  const isSearching = lookupMutation.isPending
  const isSaving = saveMutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Dados Fiscais (CNPJ)
        </CardTitle>
        <CardDescription>
          Vincule os dados oficiais da empresa via Receita Federal para emissão de notas fiscais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estado: Loading inicial */}
        {state === 'loading' && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Estado: Saved - Mostra dados salvos */}
        {state === 'saved' && savedData && (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Dados da empresa vinculados com sucesso
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 rounded-lg border p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">CNPJ</Label>
                  <p className="font-medium">{formatCnpj(savedData.cnpj)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Situação</Label>
                  <p className="font-medium">{savedData.tipo || '-'}</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Razão Social</Label>
                <p className="font-medium">{savedData.razaoSocial}</p>
              </div>

              {savedData.nomeFantasia && (
                <div>
                  <Label className="text-xs text-muted-foreground">Nome Fantasia</Label>
                  <p className="font-medium">{savedData.nomeFantasia}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Cidade/UF</Label>
                  <p className="font-medium">{savedData.municipio} / {savedData.uf}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Porte</Label>
                  <p className="font-medium">{savedData.porte || '-'}</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Atividade Principal</Label>
                <p className="text-sm">
                  <span className="font-medium">{savedData.cnaeCode}</span>
                  {' - '}
                  {savedData.cnaeDescription}
                </p>
              </div>

              {savedData.qsa && savedData.qsa.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Quadro Societário
                  </Label>
                  <div className="mt-2 space-y-2">
                    {savedData.qsa.map((socio, index) => (
                      <div key={index} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                        <span className="font-medium">{socio.nome}</span>
                        <span className="text-muted-foreground text-xs">{socio.qual}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Estado: Empty ou Error - Mostra input de busca */}
        {(state === 'empty' || state === 'error') && (
          <div className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Digite o CNPJ"
                value={cnpjInput}
                onChange={handleCnpjChange}
                className="flex-1"
                maxLength={18}
              />
              <Button
                onClick={handleLookup}
                disabled={!isValidCnpj || isSearching}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2">Buscar</span>
              </Button>
            </div>
          </div>
        )}

        {/* Estado: Preview - Mostra dados para confirmação */}
        {state === 'preview' && previewData && (
          <div className="space-y-4">
            <div className="grid gap-4 rounded-lg border p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">CNPJ</Label>
                  <p className="font-medium">{formatCnpj(previewData.cnpj)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <p className="font-medium">{previewData.tipo || '-'}</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Razão Social</Label>
                <p className="font-medium">{previewData.razaoSocial}</p>
              </div>

              {previewData.nomeFantasia && (
                <div>
                  <Label className="text-xs text-muted-foreground">Nome Fantasia</Label>
                  <p className="font-medium">{previewData.nomeFantasia}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Cidade</Label>
                  <p className="font-medium">{previewData.municipio}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">UF</Label>
                  <p className="font-medium">{previewData.uf}</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Atividade Principal</Label>
                <p className="text-sm">
                  <span className="font-medium">{previewData.cnaeCode}</span>
                  {' - '}
                  {previewData.cnaeDescription}
                </p>
              </div>

              {previewData.qsa && previewData.qsa.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Quadro Societário
                  </Label>
                  <div className="mt-2 space-y-2">
                    {previewData.qsa.map((socio, index) => (
                      <div key={index} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                        <span className="font-medium">{socio.nome}</span>
                        <span className="text-muted-foreground text-xs">{socio.qual}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Checkbox de autorização */}
            <div className="flex items-start space-x-3 rounded-lg border p-4">
              <Checkbox
                id="authorized"
                checked={authorized}
                onCheckedChange={(checked) => setAuthorized(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="authorized" className="cursor-pointer font-medium">
                  Autorizo a consulta de dados
                </Label>
                <p className="text-sm text-muted-foreground">
                  Declaro que estou autorizado a consultar e vincular os dados desta empresa
                  à minha organização, conforme a Lei Geral de Proteção de Dados (LGPD).
                </p>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPreviewData(null)
                  setCnpjInput('')
                  setAuthorized(false)
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!authorized || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Salvar Dados
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
