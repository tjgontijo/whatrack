'use client'

import type { ReactNode } from 'react'

interface DashboardContentProps {
  children: ReactNode
}

export function DashboardContent({ children }: DashboardContentProps) {
  return <>{children}</>
}
