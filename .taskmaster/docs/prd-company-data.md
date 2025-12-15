# PRD: Dados da Empresa (CNPJ)

## Visão Geral

Permitir que organizações cadastrem os dados da empresa via CNPJ, com preenchimento automático usando a API ReceitaWS. O frontend exibe apenas campos essenciais enquanto o backend armazena dados completos para BI.

## Objetivo

- Simplificar o cadastro de dados empresariais
- Enriquecer base de clientes para análise de negócio
- Validar CNPJs e situação cadastral das empresas

## API Externa

**ReceitaWS** - Consulta CNPJ na Receita Federal
- Endpoint: `GET https://receitaws.com.br/v1/cnpj/{cnpj}`
- Documentação: https://developers.receitaws.com.br
- Rate limit: 3 req/min (free) | ilimitado (pago)
- Cache recomendado: 24h

## Arquitetura

### Database Schema

```prisma
model OrganizationCompany {
  id             String   @id @default(cuid())
  organizationId String   @unique
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // === CAMPOS EXIBIDOS NO FRONTEND ===
  cnpj           String   @unique
  razaoSocial    String
  nomeFantasia   String?
  cnaeCode       String          // atividade_principal.code
  cnaeDescription String         // atividade_principal.text
  municipio      String
  uf             String   @db.Char(2)

  // === CAMPOS PARA BI (não exibidos) ===
  tipo           String?         // MATRIZ, FILIAL
  porte          String?         // MICRO EMPRESA, EPP, etc
  naturezaJuridica String?
  capitalSocial  Decimal?
  situacao       String?         // ATIVA, BAIXADA
  dataAbertura   DateTime?
  dataSituacao   DateTime?
  simplesOptante Boolean  @default(false)
  simeiOptante   Boolean  @default(false)

  // Endereço completo
  logradouro     String?
  numero         String?
  complemento    String?
  bairro         String?
  cep            String?

  // Contato
  email          String?
  telefone       String?

  // Sócios e atividades secundárias
  qsa            Json?           // Array de sócios
  atividadesSecundarias Json?    // Array de CNAEs

  // Autorização/Compliance
  authorizedByUserId String
  authorizedAt       DateTime @default(now())

  // Controle
  fetchedAt      DateTime @default(now())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([cnaeCode])
  @@index([porte])
  @@index([uf])
  @@index([situacao])
}
```

### API Endpoints

#### 1. Consultar CNPJ (sem salvar)
```
GET /api/v1/organizations/me/company/lookup?cnpj={cnpj}
```

**Response 200:**
```json
{
  "cnpj": "44.935.969/0001-20",
  "razaoSocial": "TATIANA PARANHOS ATIVIDADE MEDICA LTDA",
  "nomeFantasia": "TATIANA PARANHOS",
  "cnaeCode": "86.30-5-03",
  "cnaeDescription": "Atividade médica ambulatorial restrita a consultas",
  "municipio": "BRASILIA",
  "uf": "DF",
  "situacao": "ATIVA"
}
```

**Response 400:**
```json
{
  "error": "CNPJ inválido"
}
```

**Response 404:**
```json
{
  "error": "CNPJ não encontrado na Receita Federal"
}
```

#### 2. Salvar dados da empresa
```
POST /api/v1/organizations/me/company
```

**Request:**
```json
{
  "cnpj": "44935969000120"
}
```

**Response 201:**
```json
{
  "id": "clx...",
  "cnpj": "44.935.969/0001-20",
  "razaoSocial": "TATIANA PARANHOS ATIVIDADE MEDICA LTDA",
  "nomeFantasia": "TATIANA PARANHOS",
  "cnaeCode": "86.30-5-03",
  "cnaeDescription": "Atividade médica ambulatorial restrita a consultas",
  "municipio": "BRASILIA",
  "uf": "DF"
}
```

#### 3. Obter dados da empresa
```
GET /api/v1/organizations/me/company
```

**Response 200:**
```json
{
  "id": "clx...",
  "cnpj": "44.935.969/0001-20",
  "razaoSocial": "TATIANA PARANHOS ATIVIDADE MEDICA LTDA",
  "nomeFantasia": "TATIANA PARANHOS",
  "cnaeCode": "86.30-5-03",
  "cnaeDescription": "Atividade médica ambulatorial restrita a consultas",
  "municipio": "BRASILIA",
  "uf": "DF"
}
```

**Response 404:**
```json
{
  "error": "Empresa não cadastrada"
}
```

#### 4. Atualizar dados (re-fetch da Receita)
```
PUT /api/v1/organizations/me/company
```

Re-consulta a ReceitaWS e atualiza todos os campos.

#### 5. Remover dados da empresa
```
DELETE /api/v1/organizations/me/company
```

## Frontend

### Localização

`/dashboard/settings/organization` - Adicionar seção "Dados da Empresa"

### UX Flow

```
┌─────────────────────────────────────────────────────────┐
│  Dados da Empresa                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CNPJ                                                   │
│  ┌─────────────────────────────────┐  ┌──────────────┐ │
│  │ 44.935.969/0001-20              │  │   Buscar     │ │
│  └─────────────────────────────────┘  └──────────────┘ │
│                                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                         │
│  Razão Social                                           │
│  ┌─────────────────────────────────────────────────────┐│
│  │ TATIANA PARANHOS ATIVIDADE MEDICA LTDA       [🔒]  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  Nome Fantasia                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ TATIANA PARANHOS                              [🔒]  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  Atividade Principal                                    │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 86.30-5-03 - Atividade médica ambulatorial... [🔒]  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  Localização                                            │
│  ┌─────────────────────────────────────────────────────┐│
│  │ BRASILIA - DF                                 [🔒]  ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  [🔒] Campos preenchidos automaticamente via Receita    │
│                                                         │
│              ┌─────────────────────────────────┐        │
│              │         Salvar Empresa          │        │
│              └─────────────────────────────────┘        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Estados

1. **Sem empresa cadastrada**
   - Mostra apenas input de CNPJ + botão Buscar

2. **Buscando**
   - Input desabilitado + loading spinner no botão

3. **Dados carregados (preview)**
   - Mostra campos preenchidos (readonly)
   - **Checkbox de autorização (obrigatório)**
   - Botão "Salvar Empresa" (desabilitado até marcar checkbox)

4. **Empresa salva**
   - Campos readonly com ícone de cadeado
   - Botão "Atualizar dados" (re-fetch)
   - Botão "Remover empresa" (outline/destructive)

5. **Erro**
   - Toast com mensagem de erro
   - CNPJ inválido, não encontrado, ou situação irregular

### Checkbox de Autorização

Após buscar os dados e antes de salvar, exibir:

```
┌─────────────────────────────────────────────────────────┐
│  ☑️ Declaro que sou sócio/representante legal desta     │
│     empresa ou possuo autorização do responsável        │
│     para cadastrar estes dados.                         │
└─────────────────────────────────────────────────────────┘
```

**Regras:**
- Checkbox desmarcado por padrão
- Botão "Salvar Empresa" só habilita quando marcado
- Salvar no banco: `authorizedBy` (userId) + `authorizedAt` (timestamp)
- Texto deve ser claro sobre responsabilidade legal

### Componente

```tsx
// src/app/dashboard/settings/organization/components/company-data-section.tsx

'use client'

import { useState } from 'react'
import { useOrganization } from '@/hooks/use-organization'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Search, Lock, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { applyCnpjMask, unmaskCnpj } from '@/lib/util/cnpj-mask'

type CompanyData = {
  id?: string
  cnpj: string
  razaoSocial: string
  nomeFantasia?: string
  cnaeCode: string
  cnaeDescription: string
  municipio: string
  uf: string
}

export function CompanyDataSection() {
  const { activeOrg } = useOrganization()
  const [cnpj, setCnpj] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [preview, setPreview] = useState<CompanyData | null>(null)
  const [saved, setSaved] = useState<CompanyData | null>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)

  const handleLookup = async () => {
    const cleanCnpj = unmaskCnpj(cnpj)
    if (cleanCnpj.length !== 14) {
      toast.error('CNPJ deve ter 14 dígitos')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/v1/organizations/me/company/lookup?cnpj=${cleanCnpj}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao buscar CNPJ')
      }

      if (data.situacao !== 'ATIVA') {
        toast.warning(`Empresa com situação: ${data.situacao}`)
      }

      setPreview(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar CNPJ')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!preview) return

    setIsSaving(true)
    try {
      const res = await fetch('/api/v1/organizations/me/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: unmaskCnpj(preview.cnpj) })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSaved(data)
      setPreview(null)
      toast.success('Empresa cadastrada com sucesso!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar')
    } finally {
      setIsSaving(false)
    }
  }

  const data = saved || preview

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da Empresa</CardTitle>
        <CardDescription>
          Informe o CNPJ para buscar os dados automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!data ? (
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(applyCnpjMask(e.target.value))}
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleLookup}
              disabled={isLoading || cnpj.length < 18}
              className="mt-6"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">Buscar</span>
            </Button>
          </div>
        ) : (
          <>
            <ReadonlyField label="CNPJ" value={data.cnpj} locked={!!saved} />
            <ReadonlyField label="Razão Social" value={data.razaoSocial} locked={!!saved} />
            {data.nomeFantasia && (
              <ReadonlyField label="Nome Fantasia" value={data.nomeFantasia} locked={!!saved} />
            )}
            <ReadonlyField
              label="Atividade Principal"
              value={`${data.cnaeCode} - ${data.cnaeDescription}`}
              locked={!!saved}
            />
            <ReadonlyField
              label="Localização"
              value={`${data.municipio} - ${data.uf}`}
              locked={!!saved}
            />

            {preview && !saved && (
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                  <Checkbox
                    id="authorization"
                    checked={isAuthorized}
                    onCheckedChange={(checked) => setIsAuthorized(checked === true)}
                  />
                  <label
                    htmlFor="authorization"
                    className="text-sm leading-relaxed cursor-pointer"
                  >
                    Declaro que sou sócio/representante legal desta empresa ou
                    possuo autorização do responsável para cadastrar estes dados.
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setPreview(null); setIsAuthorized(false) }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving || !isAuthorized}>
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Salvar Empresa
                  </Button>
                </div>
              </div>
            )}

            {saved && (
              <div className="flex gap-2 pt-4">
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar dados
                </Button>
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ReadonlyField({ label, value, locked }: { label: string; value: string; locked: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
        <span className="flex-1 text-sm">{value}</span>
        {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
      </div>
    </div>
  )
}
```

## Service Layer

```typescript
// src/services/company/receita-ws.ts

const RECEITA_WS_BASE = 'https://receitaws.com.br/v1/cnpj'

type ReceitaWsResponse = {
  status: 'OK' | 'ERROR'
  cnpj: string
  nome: string
  fantasia: string
  tipo: string
  porte: string
  natureza_juridica: string
  abertura: string
  situacao: string
  data_situacao: string
  capital_social: string
  atividade_principal: Array<{ code: string; text: string }>
  atividades_secundarias: Array<{ code: string; text: string }>
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
  cep: string
  email: string
  telefone: string
  qsa: Array<{ nome: string; qual: string }>
  simples: { optante: boolean; data_opcao: string | null }
  simei: { optante: boolean; data_opcao: string | null }
  message?: string // Quando erro
}

export async function fetchCnpjData(cnpj: string): Promise<ReceitaWsResponse> {
  const cleanCnpj = cnpj.replace(/\D/g, '')

  const response = await fetch(`${RECEITA_WS_BASE}/${cleanCnpj}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 86400 } // Cache 24h
  })

  const data: ReceitaWsResponse = await response.json()

  if (data.status === 'ERROR' || data.message) {
    throw new Error(data.message || 'CNPJ não encontrado')
  }

  return data
}

export function mapReceitaWsToCompany(data: ReceitaWsResponse) {
  const parseDate = (dateStr: string) => {
    if (!dateStr) return null
    const [day, month, year] = dateStr.split('/')
    return new Date(`${year}-${month}-${day}`)
  }

  return {
    cnpj: data.cnpj,
    razaoSocial: data.nome,
    nomeFantasia: data.fantasia || null,
    tipo: data.tipo,
    porte: data.porte,
    naturezaJuridica: data.natureza_juridica,
    cnaeCode: data.atividade_principal[0]?.code || '',
    cnaeDescription: data.atividade_principal[0]?.text || '',
    capitalSocial: data.capital_social ? parseFloat(data.capital_social) : null,
    situacao: data.situacao,
    dataAbertura: parseDate(data.abertura),
    dataSituacao: parseDate(data.data_situacao),
    simplesOptante: data.simples?.optante || false,
    simeiOptante: data.simei?.optante || false,
    logradouro: data.logradouro,
    numero: data.numero,
    complemento: data.complemento,
    bairro: data.bairro,
    municipio: data.municipio,
    uf: data.uf,
    cep: data.cep?.replace(/\D/g, ''),
    email: data.email,
    telefone: data.telefone,
    qsa: data.qsa || [],
    atividadesSecundarias: data.atividades_secundarias || [],
  }
}
```

## Utilitário CNPJ Mask

```typescript
// src/lib/util/cnpj-mask.ts

export function applyCnpjMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)

  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

export function unmaskCnpj(value: string): string {
  return value.replace(/\D/g, '')
}

export function validateCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return false
  if (/^(\d)\1+$/.test(digits)) return false // Todos dígitos iguais

  // Validação dos dígitos verificadores
  let sum = 0
  let weight = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weight[i]
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (digit !== parseInt(digits[12])) return false

  sum = 0
  weight = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weight[i]
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (digit !== parseInt(digits[13])) return false

  return true
}
```

## Tasks

### Task 1: Database Schema
- Criar model `OrganizationCompany` no Prisma
- Adicionar relação em `Organization`
- Gerar migration

### Task 2: Service ReceitaWS
- Criar `src/services/company/receita-ws.ts`
- Implementar `fetchCnpjData()`
- Implementar `mapReceitaWsToCompany()`

### Task 3: Utilitário CNPJ
- Criar `src/lib/util/cnpj-mask.ts`
- `applyCnpjMask()`, `unmaskCnpj()`, `validateCnpj()`

### Task 4: API Routes
- `GET /api/v1/organizations/me/company/lookup`
- `POST /api/v1/organizations/me/company`
- `GET /api/v1/organizations/me/company`
- `PUT /api/v1/organizations/me/company`
- `DELETE /api/v1/organizations/me/company`

### Task 5: Frontend Component
- Criar `CompanyDataSection` component
- Integrar na página de settings/organization
- Estados: vazio, buscando, preview, salvo, erro

### Task 6: Testes
- Testes unitários para validação CNPJ
- Testes de integração para API routes

## Considerações

### Rate Limiting
A API ReceitaWS free tem limite de 3 req/min. Implementar:
- Cache no Next.js (`next: { revalidate: 86400 }`)
- Debounce no frontend antes de buscar
- Mensagem de erro amigável quando rate limited

### Empresas Inativas
Se `situacao !== 'ATIVA'`, mostrar warning mas permitir cadastro. Armazenar situação para análise futura.

### Dados Sensíveis
- Email e telefone da Receita podem estar desatualizados
- QSA contém dados de sócios (LGPD)
- Não expor dados de BI no frontend
