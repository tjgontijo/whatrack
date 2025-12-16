import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center p-6">
        <div className="w-full">{children}</div>
      </main>
      <Toaster richColors position="bottom-center" />
    </div>
  )
}
