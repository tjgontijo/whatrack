'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Loader2,
  Send as SendIcon,
  Settings,
  Users,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useProject } from '@/features/projects/hooks/use-project'
import {
  useRequiredProjectPath,
  useRequiredProjectRouteContext,
} from '@/features/projects/hooks/use-project-route-context'
import {
  buildCampaignCsvPreview,
  type CampaignCsvParseResult,
  parseCampaignCsv,
  validateCampaignCsvModel,
} from '@/features/whatsapp/lib/campaign-csv'
import { whatsappApi } from '@/features/whatsapp/lib/client'
import type { WhatsAppTemplate } from '@/features/whatsapp/types/whatsapp'
import { apiFetch } from '@/lib/http/api-client'
import { cn } from '@/lib/utils/utils'
import {
  type AbTestConfigDraft,
  type AbTestVariantDraft,
  CampaignWizardStepAb,
} from '../campaign-wizard-step-ab'
import { CampaignWizardStepBasic } from '../campaign-wizard-step-basic'
import { CampaignWizardStepDispatch } from '../campaign-wizard-step-dispatch'
import { CampaignWizardStepRecipients } from '../campaign-wizard-step-recipients'

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractTemplateVariables(template?: WhatsAppTemplate): string[] {
  const texts =
    template?.components
      ?.filter((c) => c.type === 'BODY' || c.type === 'HEADER')
      .map((c) => c.text || '') || []
  const matches = texts.flatMap((t) => t.match(/\{\{\s*[\w.]+\s*\}\}/g) || [])
  return Array.from(new Set(matches)).map((m) => m.replace(/[{}]/g, '').trim())
}

function resolveCampaignType(template?: WhatsAppTemplate): 'MARKETING' | 'OPERATIONAL' {
  return template?.category === 'MARKETING' ? 'MARKETING' : 'OPERATIONAL'
}

function readFileAsText(file: File): Promise<string> {
  return file.text()
}

// ─── Steps config ────────────────────────────────────────────────────────────

type StepId = 'basic' | 'ab' | 'recipients' | 'dispatch'

interface StepDef {
  id: StepId
  label: string
  icon: React.ElementType
}

const ALL_STEPS: StepDef[] = [
  { id: 'basic', label: 'Configuração', icon: Settings },
  { id: 'ab', label: 'Teste A/B', icon: FlaskConical },
  { id: 'recipients', label: 'Destinatários', icon: Users },
  { id: 'dispatch', label: 'Disparo', icon: SendIcon },
]

// ─── Component ───────────────────────────────────────────────────────────────

interface WhatsAppInstanceItem {
  id: string
  displayPhone: string
  verifiedName: string
}

const DEFAULT_AB_CONFIG: AbTestConfigDraft = {
  windowHours: 24,
  winnerCriteria: 'RESPONSE_RATE',
  remainderPercent: 0,
}

export function CampaignBuilder() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const campaignsPath = useRequiredProjectPath('/campaigns')
  const { organizationId, projectId } = useRequiredProjectRouteContext()
  const { data: activeProject, isLoading: isProjectLoading } = useProject()
  const activeProjectId = activeProject?.id || ''

  // ── Step state ──────────────────────────────────────────────────────────
  const [currentStepIdx, setCurrentStepIdx] = React.useState(0)

  // ── Step 1: Basic ───────────────────────────────────────────────────────
  const [name, setName] = React.useState('')
  const [selectedInstanceId, setSelectedInstanceId] = React.useState('')
  const [templateCategory, setTemplateCategory] = React.useState<WhatsAppTemplate['category'] | ''>(
    ''
  )
  const [selectedTemplateName, setSelectedTemplateName] = React.useState('')

  // ── Step 2: A/B ─────────────────────────────────────────────────────────
  const [isAbTest, setIsAbTest] = React.useState(false)
  const [abVariants, setAbVariants] = React.useState<AbTestVariantDraft[]>([
    { label: 'A', templateName: '', templateLang: 'pt_BR', splitPercent: 50 },
    { label: 'B', templateName: '', templateLang: 'pt_BR', splitPercent: 50 },
  ])
  const [abConfig, setAbConfig] = React.useState<AbTestConfigDraft>(DEFAULT_AB_CONFIG)

  // ── Step 3: Recipients ──────────────────────────────────────────────────
  const [parsedCsv, setParsedCsv] = React.useState<CampaignCsvParseResult | null>(null)
  const [fileError, setFileError] = React.useState<string | null>(null)
  const [phoneColumn, setPhoneColumn] = React.useState('')
  const [variableColumns, setVariableColumns] = React.useState<Record<string, string>>({})

  // ── Step 4: Dispatch ────────────────────────────────────────────────────
  const [dispatchNow, setDispatchNow] = React.useState(true)
  const [scheduledAt, setScheduledAt] = React.useState('')

  // ── Data queries ────────────────────────────────────────────────────────
  const { data: instances = [] } = useQuery<WhatsAppInstanceItem[]>({
    queryKey: ['builder-instances', organizationId, activeProjectId],
    queryFn: async () => {
      const url = new URL('/api/v1/whatsapp/instances', window.location.origin)
      url.searchParams.set('projectId', activeProjectId)
      const data = await apiFetch(url.toString(), {
        orgId: organizationId,
        projectId: activeProjectId,
      })
      return ((data as { items?: WhatsAppInstanceItem[] }).items || []) as WhatsAppInstanceItem[]
    },
    enabled: !!organizationId && !!activeProjectId,
  })

  const { data: templates = [] } = useQuery<WhatsAppTemplate[]>({
    queryKey: ['builder-templates', organizationId],
    queryFn: async () => whatsappApi.getTemplates(organizationId!),
    enabled: !!organizationId,
  })

  const approvedTemplates = React.useMemo(
    () => templates.filter((t) => t.status === 'APPROVED'),
    [templates]
  )

  const availableCategories = React.useMemo(
    () => Array.from(new Set(approvedTemplates.map((t) => t.category))),
    [approvedTemplates]
  )

  const filteredTemplates = React.useMemo(
    () => approvedTemplates.filter((t) => !templateCategory || t.category === templateCategory),
    [approvedTemplates, templateCategory]
  )

  const selectedTemplate = React.useMemo(
    () => filteredTemplates.find((t) => t.name === selectedTemplateName),
    [filteredTemplates, selectedTemplateName]
  )

  const templateVariableNames = React.useMemo(
    () => extractTemplateVariables(selectedTemplate),
    [selectedTemplate]
  )

  // Reset template on category/instance change
  React.useEffect(() => {
    setSelectedTemplateName('')
  }, [])

  // Reset variable mapping on template change
  React.useEffect(() => {
    setVariableColumns((curr) => {
      const next: Record<string, string> = {}
      for (const v of templateVariableNames) {
        if (curr[v]) next[v] = curr[v]
      }
      return next
    })
  }, [templateVariableNames])

  // When step 1 template is chosen, seed Variant A
  React.useEffect(() => {
    if (!selectedTemplate) return
    setAbVariants((prev) =>
      prev.map((v, i) =>
        i === 0
          ? { ...v, templateName: selectedTemplate.name, templateLang: selectedTemplate.language }
          : v
      )
    )
  }, [selectedTemplate])

  // ── CSV preview ─────────────────────────────────────────────────────────
  const csvPreview = React.useMemo(() => {
    if (!parsedCsv || !phoneColumn) return null
    const allMapped = templateVariableNames.every((n) => Boolean(variableColumns[n]))
    if (!allMapped) return null
    return buildCampaignCsvPreview(
      parsedCsv.rows,
      { phoneColumn, variableColumns },
      templateVariableNames
    )
  }, [parsedCsv, phoneColumn, variableColumns, templateVariableNames])

  // ── File handler ─────────────────────────────────────────────────────────
  const handleFileSelected = async (file: File | null) => {
    if (!file) {
      setParsedCsv(null)
      setFileError(null)
      setPhoneColumn('')
      setVariableColumns({})
      return
    }
    try {
      const text = await readFileAsText(file)
      const parsed = parseCampaignCsv(text)
      if (parsed.columns.length === 0 || parsed.rows.length === 0) {
        throw new Error('O CSV está vazio ou não possui cabeçalho/linhas válidas.')
      }
      const validated = validateCampaignCsvModel(parsed, templateVariableNames)
      setParsedCsv(parsed)
      setFileError(null)
      setPhoneColumn(validated.phoneColumn)
      setVariableColumns(validated.variableColumns)
      if (validated.missingVariables.length > 0) {
        toast.info(
          `${validated.missingVariables.length} variável(is) não detectadas automaticamente. Faça o mapeamento manual.`
        )
      }
    } catch (error) {
      setParsedCsv(null)
      setPhoneColumn('')
      setVariableColumns({})
      setFileError(error instanceof Error ? error.message : 'Falha ao ler o CSV.')
    }
  }

  // ── Visible steps (A/B is always visible so user can toggle) ─────────────
  const steps = ALL_STEPS
  const currentStep = steps[currentStepIdx]
  const isLastStep = currentStepIdx === steps.length - 1

  // ── Validation per step ──────────────────────────────────────────────────
  const canProceedStep: Record<StepId, boolean> = {
    basic:
      !!activeProjectId &&
      name.trim().length > 0 &&
      selectedInstanceId.length > 0 &&
      templateCategory.length > 0 &&
      selectedTemplateName.length > 0,
    ab:
      !isAbTest ||
      (abVariants.length >= 2 &&
        abVariants.every((v) => v.templateName && v.splitPercent > 0) &&
        new Set(abVariants.map((v) => v.templateName)).size === abVariants.length &&
        abVariants.reduce((s, v) => s + v.splitPercent, 0) + abConfig.remainderPercent === 100),
    recipients:
      !!parsedCsv &&
      !!csvPreview &&
      phoneColumn.length > 0 &&
      csvPreview.validRows > 0 &&
      templateVariableNames.every((n) => Boolean(variableColumns[n])),
    dispatch: dispatchNow || scheduledAt.length > 0,
  }

  const canAdvance = currentStep ? canProceedStep[currentStep.id] : false

  // ── Mutation ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !activeProjectId || !selectedTemplate || !csvPreview) {
        throw new Error('Dados insuficientes para criar a campanha')
      }

      const dispatchGroups = isAbTest
        ? abVariants.map((v, i) => ({
            configId: selectedInstanceId,
            templateName: v.templateName,
            templateLang: v.templateLang,
            order: i,
          }))
        : [
            {
              configId: selectedInstanceId,
              templateName: selectedTemplate.name,
              templateLang: selectedTemplate.language,
              order: 0,
            },
          ]

      const body: Record<string, unknown> = {
        name: name.trim(),
        type: resolveCampaignType(selectedTemplate),
        projectId: activeProjectId,
        templateName: selectedTemplate.name,
        templateLang: selectedTemplate.language,
        isAbTest,
        ...(isAbTest
          ? {
              abTestConfig: {
                windowHours: abConfig.windowHours,
                winnerCriteria: abConfig.winnerCriteria,
                remainderPercent: abConfig.remainderPercent,
                winnerVariantId: null,
                winnerSelectedAt: null,
              },
            }
          : {}),
        ...(!dispatchNow ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
        dispatchGroups,
        audience: {
          source: 'IMPORT',
          importedPhones: csvPreview.mappedRecipients.map((r) => r.phone),
          importedVariables: csvPreview.mappedRecipients.map((r) => ({
            phone: r.phone,
            variables: r.variables,
          })),
        },
      }

      const result = await apiFetch('/api/v1/whatsapp/campaigns', {
        method: 'POST',
        orgId: organizationId,
        projectId: activeProjectId,
        body: JSON.stringify(body),
      })
      return result as { id: string }
    },
    onSuccess: async (result) => {
      toast.success('Campanha criada com sucesso!')
      await queryClient.invalidateQueries({ queryKey: ['whatsapp-campaigns', organizationId] })
      router.push(`${campaignsPath}/${result.id}`)
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar campanha', { description: error.message })
    },
  })

  const selectedInstance = instances.find((i) => i.id === selectedInstanceId)

  return (
    <div className='-m-4 flex h-full flex-col bg-muted/20 md:-m-6'>
      {/* ── Sticky Header ─────────────────────────────────────────────── */}
      <header className='sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-background px-6 py-4 shadow-sm'>
        <div className='flex min-w-0 flex-col gap-0.5'>
          <h1 className='truncate font-bold text-base tracking-tight'>
            {name.trim() || 'Nova Campanha'}
          </h1>
          <p className='font-bold text-[11px] text-muted-foreground uppercase tracking-widest'>
            Passo {currentStepIdx + 1} de {steps.length} — {currentStep?.label}
          </p>
        </div>

        {/* Step indicators */}
        <nav className='hidden items-center gap-1 md:flex'>
          {steps.map((step, idx) => (
            <div key={step.id} className='flex items-center'>
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg font-bold text-xs transition-all',
                  idx === currentStepIdx
                    ? 'bg-primary text-primary-foreground shadow shadow-primary/20'
                    : idx < currentStepIdx
                      ? 'border border-green-300 bg-green-100 text-green-600'
                      : 'border border-border bg-muted text-muted-foreground/50'
                )}
              >
                {idx < currentStepIdx ? (
                  <Check className='h-3.5 w-3.5' />
                ) : (
                  <step.icon className='h-3.5 w-3.5' />
                )}
              </div>
              <span
                className={cn(
                  'mx-2 hidden font-medium text-xs lg:block',
                  idx === currentStepIdx ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
              {idx < steps.length - 1 && (
                <div className='mx-1 hidden h-px w-4 bg-border lg:block' />
              )}
            </div>
          ))}
        </nav>

        <Button
          variant='ghost'
          size='sm'
          className='shrink-0'
          onClick={() => router.push(campaignsPath)}
        >
          Cancelar
        </Button>
      </header>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <main className='flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-10'>
        <div className='mx-auto max-w-3xl'>
          {currentStep?.id === 'basic' && (
            <div className='grid gap-6'>
              <CampaignWizardStepBasic
                hasActiveProject={!!activeProjectId}
                isProjectLoading={isProjectLoading}
                instances={instances}
                availableCategories={availableCategories}
                templates={filteredTemplates}
                name={name}
                selectedInstanceId={selectedInstanceId}
                templateCategory={templateCategory}
                selectedTemplateName={selectedTemplateName}
                onNameChange={setName}
                onInstanceChange={setSelectedInstanceId}
                onTemplateCategoryChange={setTemplateCategory}
                onTemplateChange={setSelectedTemplateName}
              />
            </div>
          )}

          {currentStep?.id === 'ab' && (
            <CampaignWizardStepAb
              isAbTest={isAbTest}
              variants={abVariants}
              config={abConfig}
              templates={approvedTemplates}
              primaryTemplateName={selectedTemplateName}
              primaryTemplateLang={selectedTemplate?.language ?? 'pt_BR'}
              onIsAbTestChange={setIsAbTest}
              onVariantsChange={setAbVariants}
              onConfigChange={setAbConfig}
            />
          )}

          {currentStep?.id === 'recipients' && (
            <CampaignWizardStepRecipients
              templateName={selectedTemplate?.name || ''}
              templateVariableNames={templateVariableNames}
              parsedCsv={parsedCsv}
              preview={csvPreview}
              fileError={fileError}
              phoneColumn={phoneColumn}
              variableColumns={variableColumns}
              onFileSelected={handleFileSelected}
              onClearFileError={() => {
                setFileError(null)
                setParsedCsv(null)
                setPhoneColumn('')
                setVariableColumns({})
              }}
              onPhoneColumnChange={setPhoneColumn}
              onVariableColumnChange={(n, v) => setVariableColumns((curr) => ({ ...curr, [n]: v }))}
            />
          )}

          {currentStep?.id === 'dispatch' && (
            <CampaignWizardStepDispatch
              dispatchNow={dispatchNow}
              scheduledAt={scheduledAt}
              summary={{
                name: name || '—',
                instanceLabel: selectedInstance
                  ? `${selectedInstance.displayPhone || 'Número indisponível'}`
                  : '—',
                templateCategory: templateCategory || '—',
                templateName: selectedTemplate?.name || '—',
                recipientCount: csvPreview?.validRows || 0,
                variableCount: templateVariableNames.length,
              }}
              onDispatchModeChange={setDispatchNow}
              onScheduledAtChange={setScheduledAt}
            />
          )}
        </div>
      </main>

      {/* ── Sticky Footer ─────────────────────────────────────────────── */}
      <footer className='sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t bg-background px-6 py-3'>
        {/* Progress */}
        <div className='hidden min-w-0 flex-1 items-center gap-3 text-muted-foreground text-xs sm:flex'>
          <div className='h-1.5 w-40 overflow-hidden rounded-full bg-muted'>
            <div
              className='h-full rounded-full bg-primary transition-all duration-500 ease-out'
              style={{ width: `${((currentStepIdx + 1) / steps.length) * 100}%` }}
            />
          </div>
          <span className='whitespace-nowrap font-medium'>
            {currentStepIdx + 1} / {steps.length}
          </span>
        </div>

        <div className='ml-auto flex items-center gap-3'>
          <Button
            variant='outline'
            size='sm'
            disabled={currentStepIdx === 0}
            onClick={() => setCurrentStepIdx((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className='mr-1 h-4 w-4' />
            Voltar
          </Button>

          {isLastStep ? (
            <Button
              size='sm'
              disabled={!canProceedStep.dispatch || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Criando...
                </>
              ) : (
                <>
                  <Check className='mr-1 h-4 w-4' />
                  Criar campanha
                </>
              )}
            </Button>
          ) : (
            <Button
              size='sm'
              disabled={!canAdvance}
              onClick={() => setCurrentStepIdx((i) => Math.min(steps.length - 1, i + 1))}
            >
              Próximo
              <ChevronRight className='ml-1 h-4 w-4' />
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
