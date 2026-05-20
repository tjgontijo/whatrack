import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { getDealDetail } from '@/features/deals/services/get-deal-detail'
import { DealDetailScreen } from '@/features/deals/screens/deal-detail-screen'

interface DealDetailPageProps {
  params: Promise<{
    dealId: string
    organizationSlug: string
    projectSlug: string
  }>
}

export default async function DealDetailPage({ params }: DealDetailPageProps) {
  const { dealId, organizationSlug } = await params

  // Resolve organizationId by slug directly for maximum reliability in Server Components
  const organization = await prisma.organization.findUnique({
    where: { slug: organizationSlug },
    select: { id: true }
  })

  if (!organization) {
    return notFound()
  }

  const deal = await getDealDetail({ organizationId: organization.id, dealId })

  if (!deal) {
    return notFound()
  }

  return <DealDetailScreen dealId={dealId} initialData={deal} />
}
