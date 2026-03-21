import { redirect } from 'next/navigation'

export const metadata = { title: 'Pipeline — Configurações' }

type PipelinePageProps = {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}

export default async function PipelinePage({ params }: PipelinePageProps) {
  const { organizationSlug, projectSlug } = await params
  redirect(`/${organizationSlug}/${projectSlug}/tickets`)
}
