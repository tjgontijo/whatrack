'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'

import { SectionWrapper, ShowcaseBox } from './shared'

export function FormsSection() {
  return (
    <SectionWrapper
      id="formularios"
      title="Formulários"
      description="Composição de campos usando Field + FieldLabel + Input/Select/etc + FieldError. Sempre usar react-hook-form + zod para validação."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <ShowcaseBox>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Campos padrão
          </h3>
          <FieldGroup>
            <Field>
              <FieldLabel>Nome completo</FieldLabel>
              <Input placeholder="Digite o nome..." />
            </Field>

            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input type="email" placeholder="email@exemplo.com" />
              <FieldDescription>
                Usado para notificações do sistema.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Categoria</FieldLabel>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="suporte">Suporte</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Observações</FieldLabel>
              <Textarea placeholder="Detalhes adicionais..." />
            </Field>
          </FieldGroup>
        </ShowcaseBox>

        <div className="space-y-6">
          <ShowcaseBox>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Toggles & Checks
            </h3>
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldLabel className="flex-1">
                  <div>
                    <p className="text-sm font-medium">Notificações por email</p>
                    <p className="text-xs text-muted-foreground">
                      Receba atualizações sobre novos leads
                    </p>
                  </div>
                </FieldLabel>
                <Switch />
              </Field>

              <Separator />

              <Field orientation="horizontal">
                <FieldLabel className="flex-1">
                  <div>
                    <p className="text-sm font-medium">Modo escuro automático</p>
                    <p className="text-xs text-muted-foreground">
                      Seguir configuração do sistema
                    </p>
                  </div>
                </FieldLabel>
                <Switch defaultChecked />
              </Field>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="terms" />
                  <Label htmlFor="terms" className="text-sm">
                    Aceito os termos de uso
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="newsletter" defaultChecked />
                  <Label htmlFor="newsletter" className="text-sm">
                    Receber newsletter semanal
                  </Label>
                </div>
              </div>
            </FieldGroup>
          </ShowcaseBox>

          <ShowcaseBox>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Estado de erro
            </h3>
            <FieldGroup>
              <Field data-invalid="true">
                <FieldLabel>Nome do produto</FieldLabel>
                <Input
                  aria-invalid="true"
                  defaultValue=""
                  placeholder="Obrigatório"
                />
                <FieldError>Nome é obrigatório</FieldError>
              </Field>

              <Field data-invalid="true">
                <FieldLabel>Preço</FieldLabel>
                <Input
                  aria-invalid="true"
                  defaultValue="-50"
                />
                <FieldError>O preço deve ser maior que zero</FieldError>
              </Field>
            </FieldGroup>
          </ShowcaseBox>
        </div>
      </div>
    </SectionWrapper>
  )
}
