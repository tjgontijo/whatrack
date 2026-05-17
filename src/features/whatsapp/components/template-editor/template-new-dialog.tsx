'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface TemplateNewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue: (data: { category: string; subtype: string; language: string }) => void
}

const CATEGORY_SUBTYPES: Record<string, string[]> = {
  Marketing: ['Padrão', 'Catálogo', 'Flows', 'Detalhes do pedido', 'Solicitação de ligação'],
  Utilidade: ['Padrão', 'Flows', 'Status do pedido', 'Detalhes do pedido', 'Solicitação de ligação'],
  Autenticação: ['Código de acesso único'],
}

const LANGUAGES = [
  { code: 'pt_BR', label: 'Português (Brasil)' },
  { code: 'en_US', label: 'English (United States)' },
  { code: 'es_ES', label: 'Español (España)' },
  { code: 'fr_FR', label: 'Français' },
]

export function TemplateNewDialog({ open, onOpenChange, onContinue }: TemplateNewDialogProps) {
  const [category, setCategory] = useState<string>('Marketing')
  const [subtype, setSubtype] = useState<string>('')
  const [language, setLanguage] = useState<string>('pt_BR')

  const subtypes = CATEGORY_SUBTYPES[category] || []

  // Auto-set subtype when category changes
  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory)
    setSubtype(CATEGORY_SUBTYPES[newCategory][0])
  }

  const handleContinue = () => {
    onContinue({
      category,
      subtype,
      language,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Template</DialogTitle>
          <DialogDescription>
            Configure o tipo e idioma do seu template. Você poderá editar o conteúdo no próximo passo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Category Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Categoria</Label>
            <div className="grid grid-cols-3 gap-2">
              {['Marketing', 'Utilidade', 'Autenticação'].map((cat) => (
                <Button
                  key={cat}
                  variant={category === cat ? 'default' : 'outline'}
                  onClick={() => handleCategoryChange(cat)}
                  className="text-sm"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          {/* Subtype Selection */}
          <div className="space-y-3">
            <Label htmlFor="subtype" className="text-base font-semibold">
              Sub-tipo
            </Label>
            <Select value={subtype} onValueChange={setSubtype}>
              <SelectTrigger id="subtype">
                <SelectValue placeholder="Selecionar sub-tipo..." />
              </SelectTrigger>
              <SelectContent>
                {subtypes.map((subtype) => (
                  <SelectItem key={subtype} value={subtype}>
                    {subtype}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Language Selection */}
          <div className="space-y-3">
            <Label htmlFor="language" className="text-base font-semibold">
              Idioma
            </Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language">
                <SelectValue placeholder="Selecionar idioma..." />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleContinue} disabled={!category || !subtype}>
            Continuar →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
