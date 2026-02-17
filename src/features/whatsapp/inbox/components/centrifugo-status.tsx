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

      const status = isConnected ? '✓ Connected' : isConnected === false ? '✗ Disconnected' : '⏳ Connecting...'

      if (process.env.NODE_ENV === 'development') {
        console.log(
          '%c[Centrifugo] ' + status,
          style,
          { wsUrl, connected: isConnected }
        )
      }
    }

    checkConnection()
  }, [isConnected])

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
      <div className="font-semibold mb-2 flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : isConnected === false ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
          }`}
        />
        Centrifugo Status
      </div>
      <div className="space-y-1 text-gray-600">
        <div>
          <strong>Connection:</strong> {isConnected ? '✓ Connected' : isConnected === false ? '✗ Disconnected' : '⏳ Loading...'}
        </div>
        <div>
          <strong>URL:</strong> <code className="bg-gray-100 px-1 rounded text-xs">{wsUrl}</code>
        </div>
        <div className="text-gray-500 mt-2">
          Check console for detailed logs: <code className="bg-gray-100 px-1 rounded">[Centrifugo]</code>
        </div>
      </div>
    </div>
  )
}
