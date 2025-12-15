'use client'

import { Lock, Circle, CheckCircle2 } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QRCodeTab } from '@/components/dashboard/settings/whatsapp/qr-code-tab'
import { MetaCloudTab } from '@/components/dashboard/settings/whatsapp/meta-cloud-tab'
import { useMetaCloudStatus } from '@/hooks/use-meta-cloud-status'

export default function WhatsappSettingsPage() {
  const { hasAddon, isConfigured, isLoading } = useMetaCloudStatus()

  // Determine badge state for Business API tab
  const getBadge = () => {
    if (!hasAddon) {
      return { Icon: Lock, color: 'text-muted-foreground' }
    }
    if (!isConfigured) {
      return { Icon: Circle, color: 'text-amber-500' }
    }
    return { Icon: CheckCircle2, color: 'text-emerald-500' }
  }

  const badge = getBadge()

  return (
    <Tabs defaultValue="qr-code" className="space-y-6">
        <TabsList>
          <TabsTrigger value="qr-code">
            Seus Números
          </TabsTrigger>
          <TabsTrigger value="business-api" className="gap-1.5">
            Business API
            {!isLoading && <badge.Icon className={`h-3.5 w-3.5 ${badge.color}`} />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="qr-code">
          <QRCodeTab />
        </TabsContent>

        <TabsContent value="business-api">
          <MetaCloudTab />
        </TabsContent>
      </Tabs>
  )
}
