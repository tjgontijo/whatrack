'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { whatsappApi } from '@/lib/whatsapp/client'
import type { WhatsAppPhoneNumber, WhatsAppTemplate } from '@/types/whatsapp/whatsapp'

interface SendTestSheetProps {
  phone: WhatsAppPhoneNumber
  organizationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTemplate?: string
}

export function SendTestSheet({
  phone,
  organizationId,
  open,
  onOpenChange,
  initialTemplate,
}: SendTestSheetProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(
    initialTemplate,
  )
  const [targetNumber, setTargetNumber] = useState('')
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch approved templates
  const { data: templatesResponse } = useQuery({
    queryKey: ['whatsapp', 'templates', organizationId],
    queryFn: async () => {
      const templates = await whatsappApi.getTemplates(organizationId)
      return templates.filter((t) => t.status === 'APPROVED')
    },
    enabled: open,
  })

  const templates = templatesResponse || []
  const selectedTemplate = templates.find((t) => t.name === selectedTemplateId)

  // Extract variable names from template body
  const getBodyText = (): string => {
    if (!selectedTemplate?.components) return ''
    const bodyComponent = selectedTemplate.components.find((c) => c.type === 'BODY')
    return bodyComponent?.text || ''
  }

  const getVariablesFromTemplate = (body: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g
    const matches = []
    let match
    while ((match = regex.exec(body)) !== null) {
      matches.push(match[1])
    }
    return [...new Set(matches)]
  }

  const bodyText = getBodyText()
  const templateVariables = bodyText ? getVariablesFromTemplate(bodyText) : []

  // Generate preview with variable substitution
  const getPreview = () => {
    if (!bodyText) return ''
    let preview = bodyText
    templateVariables.forEach((varName) => {
      const value = variables[varName] || `[${varName}]`
      preview = preview.replace(`{{${varName}}}`, value)
    })
    return preview
  }

  const handleSend = async () => {
    if (!selectedTemplate || !targetNumber) return

    setIsSubmitting(true)
    try {
      // Convert variables object to array format expected by sendTemplate
      const variablesArray = templateVariables.map((name) => ({
        name,
        value: variables[name] || '',
      }))

      await whatsappApi.sendTemplate(
        targetNumber,
        selectedTemplate.name,
        organizationId,
        'pt_BR',
        variablesArray,
      )

      // Success toast would be handled by the calling component
      onOpenChange(false)
      setTargetNumber('')
      setVariables({})
      setSelectedTemplateId(undefined)
    } catch (error) {
      console.error('Failed to send test message:', error)
      // Error handling would be done by the calling component
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[450px]">
        <SheetHeader>
          <SheetTitle>Enviar Mensagem de Teste</SheetTitle>
          <SheetDescription>
            Selecione um template e configure as variáveis para enviar um teste
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Template Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Template</label>
            <Select value={selectedTemplateId || ''} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.name} value={template.name}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {selectedTemplate && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Preview</label>
              <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap">
                {getPreview()}
              </div>
            </div>
          )}

          {/* Variables */}
          {templateVariables.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Variáveis</label>
              <div className="space-y-2">
                {templateVariables.map((varName) => (
                  <Input
                    key={varName}
                    placeholder={varName}
                    value={variables[varName] || ''}
                    onChange={(e) =>
                      setVariables((prev) => ({
                        ...prev,
                        [varName]: e.target.value,
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Target Number */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Número Destino</label>
            <Input
              placeholder="+55 11 9 9999-9999"
              value={targetNumber}
              onChange={(e) => setTargetNumber(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSend}
            disabled={!selectedTemplate || !targetNumber || isSubmitting}
            className="w-full gap-2"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Enviando...' : 'Enviar Mensagem de Teste'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
