import IntegrationsPage from '../integrations/page'

export default function MetaAdsSettingsPage() {
  return <IntegrationsPage searchParams={Promise.resolve({ tab: 'meta-ads' })} />
}
