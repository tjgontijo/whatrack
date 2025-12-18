'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SendMessageForm } from './send-message-form'
import { TemplateCreationGuide } from './template-creation-guide'

export function MetaCloudDashboard() {
  return (
    <Tabs defaultValue="send" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="send">Enviar Mensagem</TabsTrigger>
        <TabsTrigger value="template">Criar Template</TabsTrigger>
      </TabsList>

      <TabsContent value="send" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Enviar Template</CardTitle>
            <CardDescription>
              Envie um template para gravar o vídeo de aprovação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SendMessageForm />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="template" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Criar Template</CardTitle>
            <CardDescription>
              Instruções para criar um template no WhatsApp Business Manager
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TemplateCreationGuide />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
