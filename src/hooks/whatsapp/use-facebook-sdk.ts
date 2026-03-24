'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    FB: {
      init: (config: {
        appId: string
        version: string
        cookie?: boolean
        status?: boolean
        xfbml?: boolean
      }) => void
      login: (
        callback: (response: FacebookAuthResponse) => void,
        options: FacebookLoginOptions
      ) => void
      getAuthResponse: () => FacebookAuthResponse | null
    }
    fbAsyncInit?: () => void
  }
}

interface FacebookAuthResponse {
  authResponse?: {
    accessToken?: string
    code?: string
    phone_number_ids?: string[]
    setup_method?: string
    userID?: string
  }
  status?: string
}

interface FacebookLoginOptions {
  config_id: string
  response_type: 'code'
  override_default_response_type: boolean
  extras?: Record<string, unknown>
}

const FB_SDK_URL = 'https://connect.facebook.net/en_US/sdk.js'
const API_VERSION = 'v22.0'

export function useFacebookSdk() {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Skip if already loaded
    if (typeof window === 'undefined') return
    if (window.FB) {
      setIsReady(true)
      return
    }

    // Check if script is already loading
    if (document.querySelector(`script[src="${FB_SDK_URL}"]`)) {
      return
    }

    const appId = process.env.NEXT_PUBLIC_META_APP_ID
    if (!appId) {
      setError('Missing NEXT_PUBLIC_META_APP_ID environment variable')
      return
    }

    // Initialize fbAsyncInit before script loads
    window.fbAsyncInit = function () {
      FB.init({
        appId,
        version: API_VERSION,
        cookie: true,
        status: true,
        xfbml: false,
      })
      setIsReady(true)
      setError(null)
    }

    // Load FB SDK script
    const script = document.createElement('script')
    script.src = `${FB_SDK_URL}#xfbml=1&version=${API_VERSION}&appId=${appId}`
    script.async = true
    script.defer = true
    script.onload = () => {
      // fbAsyncInit will be called automatically
    }
    script.onerror = () => {
      setError('Failed to load Facebook SDK')
      setIsReady(false)
    }

    document.body.appendChild(script)

    return () => {
      // Cleanup: don't remove script, keep it loaded for rest of session
      // Only set isReady to false if component unmounts before SDK loads
      if (!window.FB) {
        setIsReady(false)
      }
    }
  }, [])

  return { isReady, error }
}
