'use client'

import { useEffect, useState } from 'react'

/**
 * Debug component showing Centrifugo connection status
 * Only visible in development mode
 */
export function CentrifugoStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [wsUrl, setWsUrl] = useState<string>('')

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_CENTRIFUGO_URL
    setWsUrl(wsUrl || 'Not configured')

    // Listen to window messages for connection status updates
    const checkConnection = () => {
      // Check if any Centrifugo instance is connected by looking at console logs
      const style = isConnected
        ? 'background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold'
        : isConnected === false
          ? 'background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold'
          : 'background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold'

      const status = isConnected
        ? '✓ Connected'
        : isConnected === false
          ? '✗ Disconnected'
          : '⏳ Connecting...'

      if (process.env.NODE_ENV === 'development') {
        console.log('%c[Centrifugo] ' + status, style, { wsUrl, connected: isConnected })
      }
    }

    checkConnection()
  }, [isConnected])

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-lg">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <span
          className={`h-2 w-2 rounded-full ${
            isConnected
              ? 'bg-green-500'
              : isConnected === false
                ? 'bg-red-500'
                : 'animate-pulse bg-yellow-500'
          }`}
        />
        Centrifugo Status
      </div>
      <div className="space-y-1 text-gray-600">
        <div>
          <strong>Connection:</strong>{' '}
          {isConnected ? '✓ Connected' : isConnected === false ? '✗ Disconnected' : '⏳ Loading...'}
        </div>
        <div>
          <strong>URL:</strong> <code className="rounded bg-gray-100 px-1 text-xs">{wsUrl}</code>
        </div>
        <div className="mt-2 text-gray-500">
          Check console for detailed logs:{' '}
          <code className="rounded bg-gray-100 px-1">[Centrifugo]</code>
        </div>
      </div>
    </div>
  )
}
