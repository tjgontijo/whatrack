import AiPage from '../../ia/page'

type AiUsagePageProps = {
  params: Promise<{ organizationSlug: string }>
}

export default function AiUsagePage({ params }: AiUsagePageProps) {
  return <AiPage params={params} />
}
