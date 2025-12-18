'use client'

import { Card } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TemplateCreationGuide() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Antes de começar</p>
            <p className="text-sm text-amber-800 mt-1">
              Você precisa ter acesso ao WhatsApp Business Manager e uma conta de negócios configurada.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Passos para Criar um Template</h3>

        <div className="space-y-3">
          <div className="border rounded-lg p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-700">1</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">Acesse o WhatsApp Business Manager</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Vá para{' '}
                  <a
                    href="https://business.facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    business.facebook.com
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-700">2</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">Navegue para Ferramentas &gt; Gerenciador do WhatsApp</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No menu lateral, procure por "Gerenciador do WhatsApp" ou "WhatsApp Manager"
                </p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-700">3</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">Selecione sua Conta de Negócios do WhatsApp</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha a conta que você deseja usar para criar templates
                </p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-700">4</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">Acesse "Modelos de Mensagem" ou "Message Templates"</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em "Criar" ou "Create" para começar um novo template
                </p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-700">5</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">Preencha os Detalhes do Template</p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>Nome do template (ex: hello_world)</li>
                  <li>Categoria (Marketing, Transacional, etc)</li>
                  <li>Idioma</li>
                  <li>Conteúdo da mensagem</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-700">6</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">Envie para Aprovação</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em "Enviar" ou "Submit". A Meta analisará e aprovará em até 24 horas
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="bg-blue-50 border-blue-200 p-4">
        <div className="flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900">Dica para o Vídeo</p>
            <p className="text-sm text-blue-800 mt-1">
              Grave a tela enquanto segue estes passos. Mostre claramente a criação e o salvamento do template.
            </p>
          </div>
        </div>
      </Card>

      <Button
        asChild
        variant="outline"
        className="w-full"
      >
        <a
          href="https://business.facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2"
        >
          Abrir WhatsApp Business Manager
          <ExternalLink className="h-4 w-4" />
        </a>
      </Button>
    </div>
  )
}
