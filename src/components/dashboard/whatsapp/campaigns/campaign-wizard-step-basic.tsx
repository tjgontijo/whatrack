'use client'

import { CheckCircle2, Layers3, MessageSquare } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WhatsAppTemplate } from '@/types/whatsapp/whatsapp'

export interface CampaignWizardInstanceOption {
  id: string
  displayPhone: string
  verifiedName: string
}

interface CampaignWizardStepBasicProps {
  hasActiveProject: boolean
  isProjectLoading: boolean
  instances: CampaignWizardInstanceOption[]
  availableCategories: WhatsAppTemplate['category'][]
  templates: WhatsAppTemplate[]
  name: string
  selectedInstanceId: string
  templateCategory: WhatsAppTemplate['category'] | ''
  selectedTemplateName: string
  onNameChange: (value: string) => void
  onInstanceChange: (value: string) => void
  onTemplateCategoryChange: (value: WhatsAppTemplate['category']) => void
  onTemplateChange: (value: string) => void
}

const CATEGORY_LABELS: Record<WhatsAppTemplate['category'], string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
}

export function CampaignWizardStepBasic({
  hasActiveProject,
  isProjectLoading,
  instances,
  availableCategories,
  templates,
  name,
  selectedInstanceId,
  templateCategory,
  selectedTemplateName,
  onNameChange,
  onInstanceChange,
  onTemplateCategoryChange,
  onTemplateChange,
}: CampaignWizardStepBasicProps) {
  const selectedTemplate = templates.find((template) => template.name === selectedTemplateName)
  const bodyPreview = selectedTemplate?.components?.find((component) => component.type === 'BODY')?.text
  const isInstanceEnabled = hasActiveProject && name.trim().length > 0
  const isTemplateCategoryEnabled = isInstanceEnabled && selectedInstanceId.length > 0
  const isTemplateEnabled = isTemplateCategoryEnabled && templateCategory.length > 0

  return (
    <div className="space-y-6">
      {!hasActiveProject && (
        <Alert variant="destructive">
          <Layers3 className="h-4 w-4" />
          <AlertTitle>Projeto ativo obrigatório</AlertTitle>
          <AlertDescription>
            {isProjectLoading
              ? 'Carregando projeto ativo da sidebar.'
              : 'Selecione um projeto na sidebar antes de criar uma campanha.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="campaign-name">Nome da campanha</Label>
        <Input
          id="campaign-name"
          placeholder="Ex: Reativação de leads março"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Instância</Label>
        <Select value={selectedInstanceId} onValueChange={onInstanceChange} disabled={!isInstanceEnabled}>
          <SelectTrigger>
            <SelectValue
              placeholder={
                isInstanceEnabled
                  ? 'Selecione a instância de envio'
                  : 'Preencha o nome da campanha primeiro'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {instances.map((instance) => (
              <SelectItem key={instance.id} value={instance.id}>
                {instance.displayPhone || 'Número indisponível'} · {instance.verifiedName || 'Sem nome'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Tipo de template</Label>
        <Select
          value={templateCategory}
          onValueChange={(value) => onTemplateCategoryChange(value as WhatsAppTemplate['category'])}
          disabled={!isTemplateCategoryEnabled}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                isTemplateCategoryEnabled
                  ? 'Escolha a categoria Meta'
                  : 'Selecione uma instância primeiro'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {availableCategories.map((value) => (
              <SelectItem key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Template</Label>
        <Select value={selectedTemplateName} onValueChange={onTemplateChange} disabled={!isTemplateEnabled}>
          <SelectTrigger>
            <SelectValue
              placeholder={
                isTemplateEnabled
                  ? 'Selecione um template aprovado'
                  : 'Escolha o tipo de template primeiro'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.name} value={template.name}>
                {template.name} ({template.language})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          Somente templates aprovados
        </p>
      </div>

      {selectedTemplate && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{selectedTemplate.name}</p>
                <p className="text-muted-foreground text-xs">
                  {CATEGORY_LABELS[selectedTemplate.category]} · {selectedTemplate.language}
                </p>
              </div>
              <MessageSquare className="text-primary h-4 w-4 shrink-0" />
            </div>
            {bodyPreview ? (
              <p className="text-muted-foreground whitespace-pre-wrap text-sm">{bodyPreview}</p>
            ) : (
              <p className="text-muted-foreground text-sm">Template sem prévia de corpo disponível.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
