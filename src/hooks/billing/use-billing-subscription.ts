import { useState, useCallback, useEffect } from 'react'
import type { SubscriptionResponse, UsageResponse } from '@/schemas/billing/billing-schemas'

interface UseBillingSubscriptionReturn {
  subscription: SubscriptionResponse | null
  usage: UsageResponse | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook para fetch de subscription + usage do billing
 * Reutiliza dados via Promise.all para evitar waterfalls
 */
export function useBillingSubscription(): UseBillingSubscriptionReturn {
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null)
  const [usage, setUsage] = useState<UsageResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch ambos em paralelo
      const [subRes, usageRes] = await Promise.all([
        fetch('/api/v1/billing/subscription'),
        fetch('/api/v1/billing/usage'),
      ])

      // Checar erros HTTP
      if (!subRes.ok || !usageRes.ok) {
        // Se subscription retorna 404, é esperado (sem subscription ainda)
        if (subRes.status === 404) {
          setSubscription(null)
          setUsage(null)
          setIsLoading(false)
          return
        }

        throw new Error(`HTTP ${subRes.status || usageRes.status}`)
      }

      const [subData, usageData] = await Promise.all([subRes.json(), usageRes.json()])

      setSubscription(subData)
      setUsage(usageData)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setSubscription(null)
      setUsage(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch inicial
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    subscription,
    usage,
    isLoading,
    error,
    refetch: fetchData,
  }
}
