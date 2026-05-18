'use client'

import { useQuery } from '@tanstack/react-query'
import * as Flags from 'country-flag-icons/react/3x2'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { ExternalLink, Globe, LogOut, Send, Wifi, Zap } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRequiredProjectRouteContext } from '@/features/projects/hooks/use-project-route-context'
import { whatsappApi } from '@/features/whatsapp/lib/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WhatsAppInstance {
  id: string // configId (UUID)
  metaPhoneId: string // Meta Phone ID
  displayPhone: string
  verifiedName: string
  status: string
  qualityRating: string
  accountMode: string
  throughputLevel: string
  wabaId: string | null
  projectId: string | null
  projectName: string | null
}

interface InstanceCardDetailProps {
  instance: WhatsAppInstance
  onSendTestClick?: (instance: WhatsAppInstance) => void
  onDisconnectClick?: () => void | Promise<void>
}

// ─── Status config ─────────────────────────────────────────────────────────

const STATUS = {
  CONNECTED: {
    dot: 'bg-green-500',
    text: 'text-green-700 dark:text-green-400',
    label: 'Conectado',
  },
  DISCONNECTED: {
    dot: 'bg-red-500',
    text: 'text-red-700 dark:text-red-400',
    label: 'Desconectado',
  },
  FLAGGED: {
    dot: 'bg-orange-500',
    text: 'text-orange-700 dark:text-orange-400',
    label: 'Sinalizado',
  },
  PENDING: { dot: 'bg-slate-400', text: 'text-slate-600 dark:text-slate-400', label: 'Pendente' },
  RESTRICTED: { dot: 'bg-red-500', text: 'text-red-700 dark:text-red-400', label: 'Restrito' },
} as const

const QUALITY = {
  GREEN: { icon: '⚡', text: 'text-green-700 dark:text-green-400', label: 'Alta Qualidade' },
  YELLOW: { icon: '⚡', text: 'text-yellow-700 dark:text-yellow-400', label: 'Qualidade Média' },
  RED: { icon: '⚡', text: 'text-red-700 dark:text-red-400', label: 'Qualidade Baixa' },
  UNKNOWN: null,
} as const

const THROUGHPUT = {
  STANDARD: '1.000 msgs/dia',
  HIGH: '10.000 msgs/dia',
  VERY_HIGH: '100.000 msgs/dia',
}

// ─── Country flag helper ─────────────────────────────────────────────────────

function PhoneFlag({ number }: { number: string }) {
  const clean = number.startsWith('+') ? number : `+${number.replace(/\D/g, '')}`
  const parsed = parsePhoneNumberFromString(clean)
  const country = parsed?.country ?? (number.startsWith('1') ? 'US' : null)
  const Flag = country ? (Flags as any)[country] : null
  if (!Flag) return <Globe className='h-5 w-5 text-muted-foreground' />
  return (
    <div className='w-7 shrink-0 overflow-hidden rounded-sm border shadow-sm'>
      <Flag />
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InstanceCardDetail({
  instance,
  onSendTestClick,
  onDisconnectClick,
}: InstanceCardDetailProps) {
  const { organizationId } = useRequiredProjectRouteContext()
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['whatsapp', 'phone-profile', instance.metaPhoneId],
    queryFn: () => whatsappApi.getPhoneProfile(instance.metaPhoneId, organizationId),
    staleTime: 5 * 60 * 1000,
  })

  const handleDisconnectConfirm = async () => {
    setIsDisconnecting(true)
    try {
      await onDisconnectClick?.()
    } finally {
      setIsDisconnecting(false)
    }
  }

  // Parse phone number for pretty formatting
  const clean = instance.displayPhone.startsWith('+')
    ? instance.displayPhone
    : `+${instance.displayPhone.replace(/\D/g, '')}`
  const parsed = parsePhoneNumberFromString(clean)
  const formattedPhone = parsed?.formatInternational() ?? instance.displayPhone

  const statusCfg = STATUS[instance.status?.toUpperCase() as keyof typeof STATUS] ?? STATUS.PENDING
  const qualityCfg = QUALITY[instance.qualityRating as keyof typeof QUALITY] ?? null

  return (
    <div className='mx-auto max-w-2xl space-y-4'>
      {/* ── Main card ── */}
      <div className='overflow-hidden rounded-xl border bg-card shadow-sm'>
        {/* Header */}
        <div className='flex items-start justify-between gap-4 p-6 pb-5'>
          <div className='flex min-w-0 items-center gap-3'>
            <PhoneFlag number={instance.displayPhone} />
            <div className='min-w-0'>
              <div className='truncate font-bold text-2xl tracking-tight'>{formattedPhone}</div>
              <div className='mt-0.5 font-medium text-muted-foreground text-sm'>
                {instance.verifiedName}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className='flex shrink-0 gap-2'>
            <Button
              size='sm'
              variant='ghost'
              className='h-9 w-9 p-0'
              onClick={() => onSendTestClick?.(instance)}
              title='Enviar Teste'
            >
              <Send className='h-4 w-4' />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size='sm'
                  variant='ghost'
                  className='h-9 w-9 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive'
                  title='Desconectar'
                  disabled={isDisconnecting}
                >
                  <LogOut className='h-4 w-4' />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja desconectar este número? Você poderá reconectar depois.
                </AlertDialogDescription>
                <div className='flex justify-end gap-3'>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDisconnectConfirm}
                    className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  >
                    {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Badges row */}
        <div className='flex flex-wrap items-center gap-3 px-6 pb-5'>
          {/* Status */}
          <div className='flex items-center gap-1.5'>
            <span className={`h-2 w-2 rounded-full ${statusCfg.dot} animate-pulse`} />
            <span className={`font-semibold text-sm ${statusCfg.text}`}>{statusCfg.label}</span>
          </div>

          {qualityCfg && (
            <>
              <span className='text-muted-foreground/40'>·</span>
              <span className={`font-semibold text-sm ${qualityCfg.text}`}>
                {qualityCfg.icon} {qualityCfg.label}
              </span>
            </>
          )}

          {instance.accountMode === 'SANDBOX' && (
            <>
              <span className='text-muted-foreground/40'>·</span>
              <span className='rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 font-bold text-orange-700 text-xs dark:border-orange-700 dark:bg-orange-950 dark:text-orange-400'>
                SANDBOX
              </span>
            </>
          )}
        </div>

        <div className='border-t' />

        {/* Business profile */}
        {profileLoading ? (
          <div className='space-y-3 p-6'>
            <Skeleton className='h-4 w-32' />
            <div className='flex gap-4'>
              <Skeleton className='h-16 w-16 rounded-full' />
              <div className='flex-1 space-y-2'>
                <Skeleton className='h-4 w-40' />
                <Skeleton className='h-3 w-64' />
                <Skeleton className='h-3 w-48' />
              </div>
            </div>
          </div>
        ) : profile ? (
          <div className='space-y-4 p-6'>
            <p className='font-semibold text-muted-foreground text-xs uppercase tracking-wider'>
              Perfil Comercial
            </p>
            <div className='flex gap-4'>
              {profile.profile_picture_url ? (
                <Image
                  src={profile.profile_picture_url}
                  alt={instance.verifiedName}
                  width={64}
                  height={64}
                  className='h-16 w-16 rounded-full border object-cover'
                />
              ) : (
                <div className='flex h-16 w-16 shrink-0 items-center justify-center rounded-full border bg-muted'>
                  <span className='font-bold text-muted-foreground text-xl'>
                    {instance.verifiedName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className='min-w-0 space-y-1'>
                <div className='font-semibold'>{instance.verifiedName}</div>
                {profile.vertical && (
                  <span className='inline-block rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs'>
                    {profile.vertical}
                  </span>
                )}
                {profile.about && (
                  <p className='line-clamp-2 text-muted-foreground text-sm'>{profile.about}</p>
                )}
                <div className='flex flex-wrap gap-x-4 gap-y-1 pt-1 text-muted-foreground text-xs'>
                  {profile.email && <span>✉ {profile.email}</span>}
                  {profile.websites?.[0] && <span>🌐 {profile.websites[0]}</span>}
                  {profile.address && <span>📍 {profile.address}</span>}
                </div>
              </div>
            </div>
            <Button
              variant='link'
              size='sm'
              asChild
              className='h-auto p-0 text-muted-foreground text-xs'
            >
              <a
                href='https://business.facebook.com/latest/whatsapp_manager/phone_numbers'
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center gap-1'
              >
                Editar no Business Manager
                <ExternalLink className='h-3 w-3' />
              </a>
            </Button>
          </div>
        ) : null}

        <div className='border-t' />

        {/* Capacity row */}
        <div className='flex items-center gap-6 px-6 py-4 text-muted-foreground text-sm'>
          <div className='flex items-center gap-1.5'>
            <Wifi className='h-4 w-4' />
            <span>Cloud API</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <Zap className='h-4 w-4' />
            <span>
              {THROUGHPUT[instance.throughputLevel as keyof typeof THROUGHPUT] ?? '1.000 msgs/dia'}
            </span>
          </div>
          <span>Tier Standard</span>
        </div>
      </div>
    </div>
  )
}
