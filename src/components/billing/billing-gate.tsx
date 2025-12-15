'use client'

import { type ReactNode } from 'react'
import { useOrganizationMember } from '@/hooks/use-organization-member'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ShieldAlert } from 'lucide-react'

interface BillingGateProps {
  children: ReactNode
  /** Se true, exige role owner. Se false, aceita owner ou admin. Default: false */
  requireOwner?: boolean
  /** Componente alternativo para mostrar quando acesso negado */
  fallback?: ReactNode
}

function AccessDeniedCard() {
  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <ShieldAlert className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle>Acesso Restrito</CardTitle>
        <CardDescription>
          A gestão de billing está disponível apenas para administradores da organização.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        Entre em contato com o proprietário da organização para obter acesso.
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

export function BillingGate({ children, requireOwner = false, fallback }: BillingGateProps) {
  const { isOwner, isAdmin, isLoading } = useOrganizationMember()

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const hasAccess = requireOwner ? isOwner : isAdmin

  if (!hasAccess) {
    return fallback ?? <AccessDeniedCard />
  }

  return <>{children}</>
}
