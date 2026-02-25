'use client'

import React, { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/ui/use-mobile'
import { whatsappApi } from '@/lib/whatsapp/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import * as Flags from 'country-flag-icons/react/3x2'

import { OverviewView } from '@/components/whatsapp/settings/overview-view'

interface InstanceDetailProps {
  phoneId: string
}

export function InstanceDetail({ phoneId }: InstanceDetailProps) {
  const isMobile = useIsMobile()
  const router = useRouter()

  const { data: phone, isLoading } = useQuery({
    queryKey: ['whatsapp', 'phone', phoneId],
    queryFn: () => whatsappApi.getPhoneNumberById(phoneId),
  })

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <RefreshCw className="text-primary h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!phone) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-bold">Instância não encontrada</h2>
        <Button variant="outline" onClick={() => router.push('/dashboard/settings/whatsapp')}>
          Voltar para lista
        </Button>
      </div>
    )
  }

  // Identificar país e formatar número
  const rawNumber = phone.display_phone_number
  const cleanNumber = rawNumber.startsWith('+') ? rawNumber : `+${rawNumber.replace(/\D/g, '')}`
  const parsedPhone = parsePhoneNumberFromString(cleanNumber)

  // Fallback para US se o número começar com 1 (comum em números de teste da Meta)
  const detectedCountry =
    parsedPhone?.country || (rawNumber.startsWith('1') || rawNumber.startsWith('+1') ? 'US' : null)
  const FlagComponent = detectedCountry ? (Flags as any)[detectedCountry] : null

  return (
    <div className={isMobile ? 'space-y-6 p-4' : 'space-y-8 p-8'}>
      <header className="flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            {FlagComponent && (
              <div className="w-7 shrink-0 overflow-hidden rounded-sm border shadow-sm">
                <FlagComponent />
              </div>
            )}
            <h1 className="text-foreground text-2xl font-black tracking-tighter">
              {parsedPhone?.formatInternational() || rawNumber}
            </h1>
            <Badge
              variant="outline"
              className="bg-muted/50 border-none text-[10px] font-bold uppercase tracking-widest"
            >
              {phone.verified_name}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
              <span className="text-[9px] font-bold uppercase opacity-50">Phone ID:</span>
              <code className="bg-muted text-primary select-all rounded px-1.5 py-0.5 font-mono">
                {phone.id}
              </code>
            </div>
            {phone.webhook_configuration?.whatsapp_business_account && (
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <span className="text-[9px] font-bold uppercase opacity-50">WABA ID:</span>
                <code className="bg-muted text-primary select-all rounded px-1.5 py-0.5 font-mono">
                  {phone.webhook_configuration.whatsapp_business_account}
                </code>
              </div>
            )}
          </div>
        </div>
      </header>

      <OverviewView phone={phone} />
    </div>
  )
}
