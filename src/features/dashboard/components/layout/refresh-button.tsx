'use client'

import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'

type RefreshButtonProps = {
  queryKey: unknown[]
  label?: string
}

export function RefreshButton({ queryKey, label }: RefreshButtonProps) {
  const queryClient = useQueryClient()
  const isFetching = queryClient.isFetching({ queryKey }) > 0

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="h-7 w-7"
      title={label ?? 'Atualizar'}
      onClick={() => queryClient.invalidateQueries({ queryKey })}
      disabled={isFetching}
    >
      <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
    </Button>
  )
}
