'use client'

import React from 'react'
import { FileSpreadsheet, Phone, TableProperties, UploadCloud } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  buildCampaignTemplateCsvModel,
  type CampaignCsvParseResult,
  type CampaignCsvPreviewResult,
} from '@/lib/whatsapp/campaign-csv'

interface CampaignWizardStepRecipientsProps {
  templateName: string
  templateVariableNames: string[]
  parsedCsv: CampaignCsvParseResult | null
  preview: CampaignCsvPreviewResult | null
  fileError: string | null
  phoneColumn: string
  variableColumns: Record<string, string>
  onFileSelected: (file: File | null) => void
  onPhoneColumnChange: (value: string) => void
  onVariableColumnChange: (name: string, value: string) => void
}

export function CampaignWizardStepRecipients({
  templateName,
  templateVariableNames,
  parsedCsv,
  preview,
  fileError,
  phoneColumn,
  variableColumns,
  onFileSelected,
  onPhoneColumnChange,
  onVariableColumnChange,
}: CampaignWizardStepRecipientsProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const clearSelectedFile = React.useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    onFileSelected(null)
  }, [onFileSelected])

  const handleDownloadModel = React.useCallback(() => {
    const csvModel = buildCampaignTemplateCsvModel(templateVariableNames)
    const blob = new Blob([csvModel], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const normalizedTemplateName = templateName.trim().replace(/\s+/g, '-').toLowerCase() || 'template'

    link.href = url
    link.download = `${normalizedTemplateName}-modelo.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, [templateName, templateVariableNames])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex items-start gap-3">
            <div className="bg-muted text-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <CardTitle>Importar destinatários</CardTitle>
              <CardDescription>
                Envie um CSV com a coluna `telefone` e as variáveis do template para montar a campanha.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            id="campaign-csv"
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => onFileSelected(event.target.files?.[0] || null)}
          />

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-muted/20 hover:bg-muted/40 flex min-h-28 w-full items-center justify-between gap-4 rounded-xl border border-dashed px-4 py-4 text-left transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="bg-background flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">
                    {parsedCsv ? 'Trocar arquivo CSV' : 'Selecionar arquivo CSV'}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {parsedCsv
                      ? `${parsedCsv.rows.length} linhas lidas e ${parsedCsv.columns.length} colunas detectadas`
                      : 'Escolha a planilha exportada em CSV para mapear telefone e variáveis'}
                  </p>
                </div>
              </div>
              <span className="text-muted-foreground shrink-0 text-xs uppercase tracking-[0.18em]">
                .csv
              </span>
            </button>

            <div className="flex flex-col gap-2">
              {templateVariableNames.length > 0 && (
                <Button type="button" variant="outline" onClick={handleDownloadModel}>
                  Baixar modelo
                </Button>
              )}
              {parsedCsv && (
                <Button type="button" variant="ghost" onClick={clearSelectedFile}>
                  Remover arquivo
                </Button>
              )}
            </div>
          </div>

          <Alert>
            <AlertTitle>Formate as colunas como texto</AlertTitle>
            <AlertDescription>
              Antes de salvar o CSV no Excel ou Google Sheets, deixe a coluna de telefone e as variáveis
              formatadas como texto. Isso evita valores como `5,56198E+12` e preserva o número completo.
            </AlertDescription>
          </Alert>
          {templateVariableNames.length > 0 && (
            <p className="text-muted-foreground text-xs leading-relaxed">
              O modelo já inclui a coluna `telefone` e as variáveis do template em formato `;`. Exemplo:{' '}
              {['telefone', ...templateVariableNames].join(';')}
            </p>
          )}
        </CardContent>
      </Card>

      {fileError && (
        <Alert variant="destructive">
          <AlertTitle>Erro ao ler o arquivo</AlertTitle>
          <AlertDescription>{fileError}</AlertDescription>
        </Alert>
      )}

      {parsedCsv && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TableProperties className="h-4 w-4" />
                Colunas detectadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {parsedCsv.columns.map((column) => (
                  <Badge key={column} variant="outline">
                    {column}
                  </Badge>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Coluna de telefone</Label>
                  <Select value={phoneColumn} onValueChange={onPhoneColumnChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a coluna de telefone" />
                    </SelectTrigger>
                    <SelectContent>
                      {parsedCsv.columns.map((column) => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {templateVariableNames.length > 0 ? (
                  templateVariableNames.map((variableName) => (
                    <div key={variableName} className="space-y-2">
                      <Label>{variableName}</Label>
                      <Select
                        value={variableColumns[variableName] || ''}
                        onValueChange={(value) => onVariableColumnChange(variableName, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Mapeie ${variableName}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {parsedCsv.columns.map((column) => (
                            <SelectItem key={`${variableName}-${column}`} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                ) : (
                  <div className="bg-muted/30 rounded-md border p-3 text-sm">
                    Este template não possui variáveis para mapear.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo da leitura</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">Linhas lidas</p>
                <p className="text-xl font-bold">{preview?.totalRows ?? parsedCsv.rows.length}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">Válidas</p>
                <p className="text-xl font-bold text-green-600">{preview?.validRows ?? 0}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">Sem telefone</p>
                <p className="text-xl font-bold text-red-600">{preview?.invalidRows ?? 0}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">Duplicadas</p>
                <p className="text-xl font-bold text-yellow-600">{preview?.duplicates ?? 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Amostra do arquivo</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    {parsedCsv.columns.map((column) => (
                      <th key={column} className="text-muted-foreground px-3 py-2 text-left text-xs">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(preview?.sampleRows ?? parsedCsv.rows.slice(0, 5)).map((row, index) => (
                    <tr key={`${index}-${row[phoneColumn] || 'row'}`} className="border-b last:border-0">
                      {parsedCsv.columns.map((column) => (
                        <td key={`${index}-${column}`} className="px-3 py-2 align-top">
                          {row[column] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {!parsedCsv && !fileError && (
        <div className="text-muted-foreground flex min-h-40 items-center justify-center rounded-lg border border-dashed text-sm">
          Envie um CSV para continuar o mapeamento dos destinatários.
        </div>
      )}

      {preview && preview.validRows > 0 && (
        <Alert>
          <Phone className="h-4 w-4" />
          <AlertTitle>Prévia pronta para campanha</AlertTitle>
          <AlertDescription>
            {preview.validRows} destinatários válidos serão usados no envio após a criação da campanha.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
