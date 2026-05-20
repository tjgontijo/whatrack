'use client'

import { useState } from 'react'
import Link from 'next/link'
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
import type { LaunchpadItem } from '@/features/launchpad/services/get-launchpad-state'
import { RenameOrganizationModal } from './rename-organization-modal'
import { RenameProjectModal } from './rename-project-modal'

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
  projectName: string
  items: LaunchpadItem[]
}

export function LaunchpadScreen({
  organizationId,
  organizationSlug,
  organizationName,
  projectId,
  projectSlug,
  projectName,
  items,
}: LaunchpadScreenProps) {
  const [openModal, setOpenModal] = useState<'org' | 'project' | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const completedCount = items.filter((item) => item.completed).length
  const progress = Math.round((completedCount / items.length) * 100)

  const basePath = `/${organizationSlug}/${projectSlug}`

  const handleRenameSuccess = () => {
    setOpenModal(null)
    setRefreshKey((k) => k + 1)
    // In real app, would trigger data refresh from server
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

      {/* Checklist Grid */}
      <div className='mx-auto max-w-6xl px-6 py-12'>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {items.map((item) => {
            const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP]
            const itemHref = `${basePath}${item.href}`
            const isModalItem = ['org-name', 'project-name', 'fiscal-data'].includes(item.id)

            const handleClick = (e: React.MouseEvent) => {
              if (isModalItem && !item.completed) {
                e.preventDefault()
                if (item.id === 'org-name' || item.id === 'fiscal-data') {
                  setOpenModal('org')
                } else if (item.id === 'project-name') {
                  setOpenModal('project')
                }
              }
            }

            const Wrapper = isModalItem && !item.completed ? 'button' : Link
            const wrapperProps = isModalItem && !item.completed
              ? { type: 'button', onClick: handleClick }
              : { href: itemHref }

            return (
              <Wrapper key={item.id} {...wrapperProps} className={isModalItem && !item.completed ? 'text-left' : ''}>
                <div
                  className={`group relative h-full rounded-xl border-2 p-6 transition-all duration-300 ${
                    item.completed
                      ? 'border-border/50 bg-muted/30 hover:border-border/70 hover:bg-muted/40'
                      : 'border-primary/20 bg-gradient-to-br from-primary/5 to-primary/0 hover:border-primary/40 hover:from-primary/10'
                  }`}
                >
                  {/* Completed Overlay */}
                  {item.completed && (
                    <div className='absolute inset-0 rounded-[calc(0.75rem-1px)] bg-black/[0.02] pointer-events-none' />
                  )}

                  {/* Icon + Status */}
                  <div className='flex items-start justify-between mb-4'>
                    <div
                      className={`rounded-lg p-2.5 transition-colors ${
                        item.completed
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-primary/10 text-primary group-hover:bg-primary/15'
                      }`}
                    >
                      {Icon && <Icon className='h-5 w-5' />}
                    </div>

                    {item.completed && (
                      <CheckCircle2 className='h-5 w-5 text-green-500' />
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className='mb-4'>
                    <h3
                      className={`font-semibold text-sm leading-snug transition-colors ${
                        item.completed
                          ? 'text-muted-foreground'
                          : 'text-foreground group-hover:text-foreground/90'
                      }`}
                    >
                      {item.title}
                    </h3>
                    <p
                      className={`text-xs mt-1.5 leading-relaxed ${
                        item.completed
                          ? 'text-muted-foreground/60'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {item.description}
                    </p>
                  </div>

                  {/* Badge */}
                  <div className='flex items-center gap-2 pt-4 border-t border-border/50'>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                        item.completed
                          ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {item.completed ? (
                        <>
                          <CheckCircle2 className='h-3 w-3' />
                          Concluído
                        </>
                      ) : (
                        'Pendente'
                      )}
                    </span>
                  </div>
                </div>
              </Wrapper>
            )
          })}
        </div>

        {/* Rename Modals */}
        {openModal === 'org' && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
            <div className='bg-background rounded-lg shadow-lg p-6 max-w-md w-full mx-4'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='font-semibold text-lg'>Nomear Organização</h2>
                <button
                  onClick={() => setOpenModal(null)}
                  className='text-muted-foreground hover:text-foreground'
                >
                  <X className='h-5 w-5' />
                </button>
              </div>
              <RenameOrganizationModal
                organizationId={organizationId}
                currentName={organizationName}
                onSuccess={handleRenameSuccess}
              />
            </div>
          </div>
        )}

        {openModal === 'project' && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
            <div className='bg-background rounded-lg shadow-lg p-6 max-w-md w-full mx-4'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='font-semibold text-lg'>Nomear Projeto</h2>
                <button
                  onClick={() => setOpenModal(null)}
                  className='text-muted-foreground hover:text-foreground'
                >
                  <X className='h-5 w-5' />
                </button>
              </div>
              <RenameProjectModal
                projectId={projectId}
                currentName={projectName}
                onSuccess={handleRenameSuccess}
              />
            </div>
          </div>
        )}

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
