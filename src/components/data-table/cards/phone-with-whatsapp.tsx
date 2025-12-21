'use client'

import * as React from 'react'
import Image from 'next/image'
import { applyWhatsAppMask } from '@/lib/mask/phone-mask'
import { cn } from '@/lib/utils'

interface PhoneWithWhatsAppProps {
  phone: string | null | undefined
  className?: string
}

/**
 * PhoneWithWhatsApp - Displays phone number with WhatsApp button
 *
 * Features:
 * - Formats phone with WhatsApp mask
 * - Direct WhatsApp link
 * - Only shows button if phone is valid (10+ digits)
 * - Responsive design
 */
export const PhoneWithWhatsApp = React.forwardRef<HTMLDivElement, PhoneWithWhatsAppProps>(
  ({ phone, className }, ref) => {
    if (!phone) {
      return null
    }

    const masked = applyWhatsAppMask(phone)
    const whatsappNumber = phone.replace(/\D/g, '')
    const hasValidPhone = whatsappNumber.length >= 10

    return (
      <div ref={ref} className={cn('flex items-center gap-2', className)}>
        <span className="text-sm text-foreground">{masked}</span>
        {hasValidPhone && (
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-emerald-600 transition hover:border-emerald-500/40 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`Conversar no WhatsApp com ${masked}`}
          >
            <Image
              src="/images/whatsapp.png"
              alt="WhatsApp"
              width={16}
              height={16}
              className="h-4 w-4 object-contain"
            />
          </a>
        )}
      </div>
    )
  }
)

PhoneWithWhatsApp.displayName = 'PhoneWithWhatsApp'
