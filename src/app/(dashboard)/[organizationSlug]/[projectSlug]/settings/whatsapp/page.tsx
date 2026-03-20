import IntegrationsPage from '../integrations/page'

export default function WhatsAppSettingsRoute() {
  return <IntegrationsPage searchParams={Promise.resolve({ tab: 'whatsapp' })} />
}
