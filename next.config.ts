import type { NextConfig } from 'next'
import { GLOBAL_SECURITY_HEADERS } from './src/lib/security/http-security-headers'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    unoptimized: true,
  },

  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: GLOBAL_SECURITY_HEADERS,
      },
    ]
  },
}

export default nextConfig
