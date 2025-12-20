'use client'

import { useQuery } from '@tanstack/react-query'
import { Zap } from 'lucide-react'
import { authClient } from '@/lib/auth/auth-client'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type CreditsResponse = {
  balance: number
  usedThisCycle: number
  quota: number
  planName: string
}

async function fetchCredits(organizationId: string): Promise<CreditsResponse> {
  const res = await fetch('/api/v1/ai/credits', {
    headers: {
      'x-organization-id': organizationId,
    },
  })
  if (!res.ok) throw new Error('Failed to fetch credits')
  return res.json()
}

export function AICreditsBadge() {
  const { data: activeOrg } = authClient.useActiveOrganization()

  const organizationId = activeOrg?.id

  const { data, isLoading } = useQuery({
    queryKey: ['ai-credits', organizationId],
    queryFn: () => fetchCredits(organizationId!),
    enabled: Boolean(organizationId),
    refetchInterval: 60000, // Refresh every minute
  })

  if (isLoading || !data || data.quota === 0) {
    return null
  }

  const isLow = data.balance <= data.quota * 0.2
  const variant = isLow ? 'destructive' : 'secondary'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant} className="gap-1 cursor-default">
            <Zap className="h-3 w-3" />
            {data.balance}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{data.balance} de {data.quota} restantes</p>
          <p className="text-xs text-muted-foreground">
            Plano {data.planName}: {data.quota}/mês
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
