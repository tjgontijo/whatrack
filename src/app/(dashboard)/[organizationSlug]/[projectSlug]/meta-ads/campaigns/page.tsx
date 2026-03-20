import MetaAdsPage from '../page'

export default function MetaAdsCampaignsPage() {
  return <MetaAdsPage searchParams={Promise.resolve({ tab: 'campaigns' })} />
}
