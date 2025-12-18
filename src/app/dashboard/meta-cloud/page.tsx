import { Metadata } from 'next'
import { MetaCloudDashboard } from './components/meta-cloud-dashboard'

export const metadata: Metadata = {
  title: 'Meta Cloud - Dashboard',
  description: 'Gerenciar webhooks e mensagens do Meta Cloud WhatsApp',
}

export default function MetaCloudPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meta Cloud WhatsApp</h1>
        <p className="text-muted-foreground mt-2">
          Gerenciar webhooks, enviar mensagens de teste e visualizar eventos recebidos
        </p>
      </div>

      <MetaCloudDashboard />
    </div>
  )
}
