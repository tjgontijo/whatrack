'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Kanban,
  MessageSquare,
  Rocket,
  X,
} from 'lucide-react'
import { MetaIcon } from '@/components/shared/icons'
import { Button } from '@/components/ui/button'
import { EditStagesModal } from '@/features/deal-stage-templates/dialogs/edit-stages-modal'
import { useDealStagesQuery } from '@/features/deals/queries/use-deal-stages-query'
import type { LaunchpadItem } from '@/features/launchpad/services/get-launchpad-state'
import { useMetaAdsOnboarding } from '@/features/meta-ads/hooks/use-meta-ads-onboarding'
import { useWhatsAppOnboarding } from '@/features/whatsapp/hooks/use-whatsapp-onboarding'
import { FiscalDataModal } from './fiscal-data-modal'
import { RenameOrganizationModal } from './rename-organization-modal'

const ICON_MAP = {
  Building2,
  MessageSquare,
  Meta: MetaIcon,
  Kanban,
  CreditCard,
}

interface LaunchpadScreenProps {
  organizationId: string
  organizationSlug: string
  organizationName: string
  projectId: string
  projectSlug: string
  items: LaunchpadItem[]
}

export function LaunchpadScreen({
  organizationId,
  organizationSlug,
  organizationName,
  projectId,
  projectSlug,
  items,
}: LaunchpadScreenProps) {
  const router = useRouter()
  const [openModal, setOpenModal] = useState<'org' | 'fiscal' | 'pipeline' | null>(null)
  const [optimisticCompleted, setOptimisticCompleted] = useState<Record<string, boolean>>({})
  const { data: stagesData } = useDealStagesQuery({
    organizationId,
    projectId,
    enabled: true,
  })
  const { startOnboarding: startMetaAdsOnboarding } = useMetaAdsOnboarding(organizationId, () => {
    router.refresh()
  })
  const { startOnboarding } = useWhatsAppOnboarding(() => {
    router.refresh()
  })

  const completionByItem = items.map((item) => item.completed || optimisticCompleted[item.id] === true)
  const completedCount = completionByItem.filter(Boolean).length
  const progress = Math.round((completedCount / items.length) * 100)
  const firstPendingIndex = completionByItem.findIndex((done) => !done)

  const basePath = `/${organizationSlug}/${projectSlug}`

  const handleRenameSuccess = (data?: { slug: string }) => {
    setOpenModal(null)

    if (data?.slug && data.slug !== organizationSlug) {
      router.replace(`/${data.slug}/${projectSlug}/launchpad`)
      return
    }

    router.refresh()
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-background via-background to-muted/20'>
      {/* Header */}
      <div className='border-border/50 border-b bg-background/80 backdrop-blur-sm'>
        <div className='mx-auto max-w-6xl px-6 py-12'>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-primary/10 p-2.5'>
              <Rocket className='h-6 w-6 text-primary' />
            </div>
            <div>
              <h1 className='font-bold text-3xl text-foreground tracking-tight'>
                Configure sua conta
              </h1>
              <p className='text-muted-foreground text-sm mt-1'>
                Complète os itens abaixo para começar a usar a plataforma
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className='mt-8'>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-muted-foreground text-sm font-medium'>
                Progresso
              </span>
              <span className='font-semibold text-foreground text-sm'>
                {completedCount} de {items.length}
              </span>
            </div>
            <div className='h-2 w-full rounded-full bg-muted overflow-hidden'>
              <div
                className='h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500'
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className='mx-auto max-w-6xl px-6 py-12'>
        <div className='space-y-3'>
          {items.map((item, index) => {
            const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP]
            const itemHref = `${basePath}${item.href}`
            const isActionItem = ['org-name', 'fiscal-data', 'whatsapp', 'meta-ads', 'pipeline'].includes(
              item.id
            )
            const isCompleted = completionByItem[index]
            const isLocked = !isCompleted && firstPendingIndex !== -1 && index > firstPendingIndex

            const handleClick = (e: React.MouseEvent) => {
              if (isLocked) {
                e.preventDefault()
                return
              }

              if (isActionItem && !isCompleted) {
                e.preventDefault()
                if (item.id === 'org-name') {
                  setOpenModal('org')
                } else if (item.id === 'fiscal-data') {
                  setOpenModal('fiscal')
                } else if (item.id === 'whatsapp') {
                  void startOnboarding()
                } else if (item.id === 'meta-ads') {
                  void startMetaAdsOnboarding()
                } else if (item.id === 'pipeline') {
                  setOpenModal('pipeline')
                }
              }
            }

            const card = (
              <div
                className={`group relative rounded-xl border p-4 transition-all duration-200 ${
                  isCompleted
                    ? 'border-green-500/30 bg-green-500/5 hover:border-green-500/40'
                    : isLocked
                      ? 'border-border/60 bg-muted/20 opacity-60'
                    : 'border-border bg-muted/30 hover:border-border/80 hover:bg-muted/40'
                }`}
              >
                <div className='flex items-center justify-between gap-4'>
                  <div
                    className={`rounded-lg p-2.5 ${
                      isCompleted
                        ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {Icon && <Icon className='h-5 w-5' />}
                  </div>

                  <div className='min-w-0 flex-1'>
                    <h3 className='font-semibold text-foreground text-sm leading-snug'>
                      {item.title}
                    </h3>
                    <p className='mt-1 text-muted-foreground text-xs leading-relaxed'>
                      {item.description}
                    </p>
                  </div>

                  {isCompleted && <CheckCircle2 className='h-5 w-5 text-green-500' />}

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium text-xs ${
                      isCompleted
                        ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                        : isLocked
                          ? 'bg-muted text-muted-foreground/80'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className='h-3 w-3' />
                        Concluído
                      </>
                    ) : isLocked ? (
                      'Bloqueado'
                    ) : (
                      'Pendente'
                    )}
                  </span>
                </div>
              </div>
            )

            if (isActionItem && !isCompleted) {
              return (
                <button
                  key={item.id}
                  type='button'
                  onClick={handleClick}
                  disabled={isLocked}
                  className='w-full text-left'
                >
                  {card}
                </button>
              )
            }

            if (isLocked) {
              return <div key={item.id}>{card}</div>
            }

            return (
              <Link key={item.id} href={itemHref} className='block'>
                {card}
              </Link>
            )
          })}
        </div>

        {/* Rename Modals */}
        {openModal === 'org' && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
            <div className='bg-background rounded-lg shadow-lg p-6 max-w-md w-full mx-4'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='font-semibold text-lg'>Organização</h2>
                <button
                  onClick={() => setOpenModal(null)}
                  className='text-muted-foreground hover:text-foreground'
                >
                  <X className='h-5 w-5' />
                </button>
              </div>
              <RenameOrganizationModal
                organizationId={organizationId}
                onSuccess={handleRenameSuccess}
              />
            </div>
          </div>
        )}

        {openModal === 'fiscal' && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
            <div className='bg-background rounded-lg shadow-lg p-6 max-w-md w-full mx-4'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='font-semibold text-lg'>Dados fiscais</h2>
                <button
                  onClick={() => setOpenModal(null)}
                  className='text-muted-foreground hover:text-foreground'
                >
                  <X className='h-5 w-5' />
                </button>
              </div>
              <FiscalDataModal
                organizationId={organizationId}
                onSuccess={() => {
                  setOptimisticCompleted((prev) => ({ ...prev, 'fiscal-data': true }))
                  setOpenModal(null)
                  router.refresh()
                }}
              />
            </div>
          </div>
        )}

        <EditStagesModal
          open={openModal === 'pipeline'}
          onOpenChange={(open) => setOpenModal(open ? 'pipeline' : null)}
          projectId={projectId}
          organizationId={organizationId}
          currentStages={stagesData?.items ?? []}
        />

        {/* Call to Action for first pending item */}
        {completedCount < items.length && (
          <div className='mt-12 rounded-lg bg-primary/5 border border-primary/20 p-6'>
            <p className='text-muted-foreground text-sm'>
              Comece clicando no primeiro item pendente acima. Você está a{' '}
              <span className='font-semibold text-foreground'>
                {items.length - completedCount} passo{items.length - completedCount > 1 ? 's' : ''}
              </span>{' '}
              de completar seu setup.
            </p>
          </div>
        )}

        {/* Completed Message */}
        {completedCount === items.length && (
          <div className='mt-12 rounded-lg bg-green-500/10 border border-green-500/20 p-6 text-center'>
            <CheckCircle2 className='h-8 w-8 text-green-500 mx-auto mb-3' />
            <h3 className='font-semibold text-foreground text-lg'>
              Parabéns! Sua conta está configurada
            </h3>
            <p className='text-muted-foreground text-sm mt-2'>
              Você está pronto para começar a usar a plataforma em todo seu potencial.
            </p>
            <Link href={`/${organizationSlug}/${projectSlug}`}>
              <Button className='mt-4'>Ir para o Dashboard</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
