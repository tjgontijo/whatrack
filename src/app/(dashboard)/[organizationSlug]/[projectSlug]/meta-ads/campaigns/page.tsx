import MetaAdsPage from '../page'

type MetaAdsCampaignsPageProps = {
  params: Promise<{ organizationSlug: string }>
}

export default function MetaAdsCampaignsPage({ params }: MetaAdsCampaignsPageProps) {
  return <MetaAdsPage params={params} />
}
