'use client'

import Link from 'next/link'
import { Phone, CheckCircle2, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { WhatsAppPhoneNumber } from '@/types/whatsapp/whatsapp'

interface InstanceCardProps {
  phone: WhatsAppPhoneNumber
}

export function InstanceCard({ phone }: InstanceCardProps) {
  const isConnected = phone.status === 'CONNECTED'

  // Tradução amigável do nível de qualidade
  const qualityLabel =
    {
      GREEN: 'Qualidade Alta',
      YELLOW: 'Qualidade Média',
      RED: 'Qualidade Baixa',
      UNKNOWN: 'Qualidade Desconhecida',
    }[phone.quality_rating] || 'Qualidade Desconhecida'

  const qualityColor =
    {
      GREEN: 'text-green-600 bg-green-500/10 border-green-200',
      YELLOW: 'text-yellow-600 bg-yellow-500/10 border-yellow-200',
      RED: 'text-red-600 bg-red-500/10 border-red-200',
      UNKNOWN: 'text-slate-600 bg-slate-500/10 border-slate-200',
    }[phone.quality_rating] || 'text-slate-600 bg-slate-500/10 border-slate-200'

  return (
    <Link href={`/dashboard/settings/whatsapp/${phone.id}`} className="group block h-full">
      <Card className="hover:border-primary/50 relative h-full overflow-hidden transition-all hover:shadow-sm">
        <div
          className={`absolute left-0 top-0 h-full w-1 ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}
        />

        <CardContent className="flex h-full flex-col justify-between p-6 pl-7">
          <div>
            <div className="mb-4 flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-foreground text-xl font-bold tracking-tight">
                  {phone.display_phone_number}
                </h3>
                <p className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
                  {phone.verified_name}
                  {phone.code_verification_status === 'VERIFIED' && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                  )}
                </p>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${isConnected ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}
              >
                <Phone className="h-5 w-5" />
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <Badge variant="outline" className={`border font-semibold ${qualityColor}`}>
                {qualityLabel}
              </Badge>
              <Badge variant="outline" className="text-muted-foreground font-semibold">
                {phone.throughput.level === 'STANDARD' ? 'Limite Padrão' : 'Alto Volume'}
              </Badge>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t pt-2">
            <span className="text-muted-foreground text-xs font-medium">
              {isConnected ? 'Conectado e Operando' : 'Verifique a conexão'}
            </span>
            <ArrowRight className="text-primary h-4 w-4 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
