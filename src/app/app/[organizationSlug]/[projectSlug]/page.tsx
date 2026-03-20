import { redirect } from 'next/navigation'

interface ProjectPageProps {
  params: Promise<{
    organizationSlug: string
    projectSlug: string
  }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { organizationSlug, projectSlug } = await params
  redirect(`/app/${organizationSlug}/${projectSlug}/dashboard`)
}
