'use client'

import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Megaphone, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'

import { CrudEditDrawer } from '@/components/dashboard/crud'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { authClient } from '@/lib/auth/auth-client'
import { apiFetch } from '@/lib/api-client'
import {
  parseCampaignCsv,
  buildCampaignCsvPreview,
  validateCampaignCsvModel,
  type CampaignCsvParseResult,
} from '@/lib/whatsapp/campaign-csv'
import { whatsappApi } from '@/lib/whatsapp/client'
import { useProject } from '@/hooks/project/use-project'
import type { WhatsAppTemplate } from '@/types/whatsapp/whatsapp'
import { CampaignWizardStepBasic } from './campaign-wizard-step-basic'
import { CampaignWizardStepRecipients } from './campaign-wizard-step-recipients'
import { CampaignWizardStepDispatch } from './campaign-wizard-step-dispatch'

type WizardStep = 1 | 2 | 3

interface CampaignFormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (campaignId: string) => void
}

interface WhatsAppInstanceItem {
  id: string
  displayPhone: string
  verifiedName: string
}

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Configuração',
  2: 'Destinatários',
  3: 'Disparo',
}

function extractTemplateVariables(template?: WhatsAppTemplate): string[] {
  const texts =
    template?.components
      ?.filter((component) => component.type === 'BODY' || component.type === 'HEADER')
      .map((component) => component.text || '') || []

  const matches = texts.flatMap((text) => text.match(/\{\{\s*[\w.]+\s*\}\}/g) || [])
  return Array.from(new Set(matches)).map((match) => match.replace(/[{}]/g, '').trim())
}

function resolveCampaignType(template?: WhatsAppTemplate): 'MARKETING' | 'OPERATIONAL' {
  return template?.category === 'MARKETING' ? 'MARKETING' : 'OPERATIONAL'
}

function readFileAsText(file: File): Promise<string> {
  return file.text()
}

export function CampaignFormDrawer({ open, onOpenChange, onSuccess }: CampaignFormDrawerProps) {
  const queryClient = useQueryClient()
  const { data: activeOrg } = authClient.useActiveOrganization()
  const { data: activeProject, isLoading: isProjectLoading } = useProject()
  const organizationId = activeOrg?.id
  const activeProjectId = activeProject?.id || ''

  const [step, setStep] = React.useState<WizardStep>(1)
  const [name, setName] = React.useState('')
  const [selectedInstanceId, setSelectedInstanceId] = React.useState('')
  const [templateCategory, setTemplateCategory] = React.useState<WhatsAppTemplate['category'] | ''>('')
  const [selectedTemplateName, setSelectedTemplateName] = React.useState('')
  const [parsedCsv, setParsedCsv] = React.useState<CampaignCsvParseResult | null>(null)
  const [fileError, setFileError] = React.useState<string | null>(null)
  const [phoneColumn, setPhoneColumn] = React.useState('')
  const [variableColumns, setVariableColumns] = React.useState<Record<string, string>>({})
  const [dispatchNow, setDispatchNow] = React.useState(true)
  const [scheduledAt, setScheduledAt] = React.useState('')

  const hasActiveProject = Boolean(activeProjectId)

  const resetWizard = React.useCallback(() => {
    setStep(1)
    setName('')
    setSelectedInstanceId('')
    setTemplateCategory('')
    setSelectedTemplateName('')
    setParsedCsv(null)
    setFileError(null)
    setPhoneColumn('')
    setVariableColumns({})
    setDispatchNow(true)
    setScheduledAt('')
  }, [])

  React.useEffect(() => {
    if (!open) {
      resetWizard()
    }
  }, [open, resetWizard])

  const { data: instances = [] } = useQuery<WhatsAppInstanceItem[]>({
    queryKey: ['campaign-drawer-instances', organizationId, activeProjectId],
    queryFn: async () => {
      const url = new URL('/api/v1/whatsapp/instances', window.location.origin)
      url.searchParams.set('projectId', activeProjectId)
      const data = await apiFetch(url.toString(), { orgId: organizationId })
      return ((data as { items?: WhatsAppInstanceItem[] }).items || []) as WhatsAppInstanceItem[]
    },
    enabled: open && !!organizationId && hasActiveProject,
  })

  const { data: templates = [] } = useQuery<WhatsAppTemplate[]>({
    queryKey: ['campaign-drawer-templates', organizationId],
    queryFn: async () => whatsappApi.getTemplates(organizationId!),
    enabled: open && !!organizationId,
  })

  const approvedTemplates = React.useMemo(
    () => templates.filter((template) => template.status === 'APPROVED'),
    [templates],
  )

  const availableCategories = React.useMemo(
    () => Array.from(new Set(approvedTemplates.map((template) => template.category))),
    [approvedTemplates],
  )

  const filteredTemplates = React.useMemo(
    () =>
      approvedTemplates.filter(
        (template) =>
          !templateCategory || template.category === templateCategory,
      ),
    [approvedTemplates, templateCategory],
  )

  const selectedTemplate = React.useMemo(
    () => filteredTemplates.find((template) => template.name === selectedTemplateName),
    [filteredTemplates, selectedTemplateName],
  )

  const templateVariableNames = React.useMemo(
    () => extractTemplateVariables(selectedTemplate),
    [selectedTemplate],
  )

  React.useEffect(() => {
    setSelectedTemplateName('')
  }, [templateCategory, selectedInstanceId])

  React.useEffect(() => {
    setVariableColumns((current) => {
      const next: Record<string, string> = {}
      for (const variableName of templateVariableNames) {
        if (current[variableName]) {
          next[variableName] = current[variableName]
        }
      }
      return next
    })
  }, [templateVariableNames])

  const csvPreview = React.useMemo(() => {
    if (!parsedCsv || !phoneColumn) return null

    const allVariablesMapped = templateVariableNames.every((name) => Boolean(variableColumns[name]))
    if (!allVariablesMapped) return null

    return buildCampaignCsvPreview(parsedCsv.rows, { phoneColumn, variableColumns }, templateVariableNames)
  }, [parsedCsv, phoneColumn, variableColumns, templateVariableNames])

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !activeProjectId || !selectedTemplate || !csvPreview) {
        throw new Error('Dados insuficientes para criar a campanha')
      }

      const body = {
        name: name.trim(),
        type: resolveCampaignType(selectedTemplate),
        projectId: activeProjectId,
        templateName: selectedTemplate.name,
        templateLang: selectedTemplate.language,
        ...(dispatchNow
          ? {}
          : {
              scheduledAt: new Date(scheduledAt).toISOString(),
            }),
        dispatchGroups: [
          {
            configId: selectedInstanceId,
            templateName: selectedTemplate.name,
            templateLang: selectedTemplate.language,
            order: 0,
          },
        ],
        audience: {
          source: 'IMPORT',
          importedPhones: csvPreview.mappedRecipients.map((recipient) => recipient.phone),
          importedVariables: csvPreview.mappedRecipients.map((recipient) => ({
            phone: recipient.phone,
            variables: recipient.variables,
          })),
        },
      }

      const result = await apiFetch('/api/v1/whatsapp/campaigns', {
        method: 'POST',
        orgId: organizationId,
        body: JSON.stringify(body),
      })

      return result as { id: string }
    },
    onSuccess: async (result) => {
      toast.success('Campanha criada com sucesso!')
      await queryClient.invalidateQueries({ queryKey: ['whatsapp-campaigns', organizationId] })
      onOpenChange(false)
      if (result?.id) {
        onSuccess?.(result.id)
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar campanha', { description: error.message })
    },
  })

  const handleOpenChange = (next: boolean) => {
    if (next && !hasActiveProject && !isProjectLoading) {
      toast.error('Selecione um projeto ativo na sidebar para criar campanhas.')
      return
    }

    onOpenChange(next)
  }

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

      const validatedModel = validateCampaignCsvModel(parsed, templateVariableNames)

      setParsedCsv(parsed)
      setFileError(null)
      setPhoneColumn(validatedModel.phoneColumn)
      setVariableColumns(validatedModel.variableColumns)
    } catch (error) {
      setParsedCsv(null)
      setPhoneColumn('')
      setVariableColumns({})
      setFileError(error instanceof Error ? error.message : 'Falha ao ler o arquivo CSV.')
    }
  }

  const handleClearFileError = React.useCallback(() => {
    setFileError(null)
    setParsedCsv(null)
    setPhoneColumn('')
    setVariableColumns({})
  }, [])

  const canAdvanceFromStep1 =
    hasActiveProject &&
    name.trim().length > 0 &&
    selectedInstanceId.length > 0 &&
    templateCategory.length > 0 &&
    selectedTemplateName.length > 0

  const canAdvanceFromStep2 =
    !!parsedCsv &&
    !!csvPreview &&
    phoneColumn.length > 0 &&
    csvPreview.validRows > 0 &&
    templateVariableNames.every((name) => Boolean(variableColumns[name]))

  const canSubmit =
    canAdvanceFromStep2 && (dispatchNow || scheduledAt.length > 0) && !createMutation.isPending

  const selectedInstance = instances.find((instance) => instance.id === selectedInstanceId)
  const progress = (step / 3) * 100

  return (
    <CrudEditDrawer
      open={open}
      onOpenChange={handleOpenChange}
      title="Nova campanha"
      subtitle="Crie a campanha em 3 passos: configuração, destinatários e disparo."
      icon={Megaphone}
      showFooter={false}
      desktopDirection="right"
      mobileDirection="bottom"
      maxWidth="max-w-[960px]"
      desktopPanelWidthClassName="data-[side=right]:!w-[min(96vw,1040px)] data-[side=right]:sm:!max-w-none"
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">
                Passo {step} de 3
              </p>
              <p className="font-semibold">{STEP_LABELS[step]}</p>
            </div>
            <div className="text-muted-foreground flex gap-2 text-xs">
              {([1, 2, 3] as WizardStep[]).map((current) => (
                <span
                  key={current}
                  className={current === step ? 'text-foreground font-semibold' : ''}
                >
                  {STEP_LABELS[current]}
                </span>
              ))}
            </div>
          </div>
          <Progress value={progress} />
        </div>

        {step === 1 && (
          <CampaignWizardStepBasic
            hasActiveProject={hasActiveProject}
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
        )}

        {step === 2 && (
          <CampaignWizardStepRecipients
            templateName={selectedTemplate?.name || ''}
            templateVariableNames={templateVariableNames}
            parsedCsv={parsedCsv}
            preview={csvPreview}
            fileError={fileError}
            phoneColumn={phoneColumn}
            variableColumns={variableColumns}
            onFileSelected={handleFileSelected}
            onClearFileError={handleClearFileError}
            onPhoneColumnChange={setPhoneColumn}
            onVariableColumnChange={(name, value) =>
              setVariableColumns((current) => ({ ...current, [name]: value }))
            }
          />
        )}

        {step === 3 && (
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

        {!hasActiveProject && (
          <Alert variant="destructive">
            <UploadCloud className="h-4 w-4" />
            <AlertTitle>Projeto ativo necessário</AlertTitle>
            <AlertDescription>
              O wizard usa o projeto selecionado na sidebar para listar instâncias e criar a campanha.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between gap-3 border-t pt-4">
          <Button type="button" variant="outline" onClick={() => (step === 1 ? onOpenChange(false) : setStep((step - 1) as WizardStep))}>
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </Button>

          <div className="flex gap-3">
            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep((step + 1) as WizardStep)}
                disabled={(step === 1 && !canAdvanceFromStep1) || (step === 2 && !canAdvanceFromStep2)}
              >
                Próximo
              </Button>
            ) : (
              <Button type="button" onClick={() => createMutation.mutate()} disabled={!canSubmit}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar campanha'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </CrudEditDrawer>
  )
}
