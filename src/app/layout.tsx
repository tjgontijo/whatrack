import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import './globals.css'
import { cookies } from 'next/headers'
import { I18nProvider } from '@/lib/i18n/provider'
import { getMessages } from '@/lib/i18n/messages'
import Providers from '@/components/shared/providers'

export const metadata: Metadata = {
  title: 'WhaTrack | Prove o ROI dos seus clientes no WhatsApp',
  description:
    'Plataforma para agências e gestores de tráfego conectarem Meta Ads ao WhatsApp, rastrearem conversões e provarem resultado para cada cliente.',
  openGraph: {
    title: 'WhaTrack | Prove o ROI dos seus clientes no WhatsApp',
    description:
      'Conecte Meta Ads e WhatsApp, rastreie conversões reais e mostre relatórios de ROI que seus clientes entendem.',
    type: 'website',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const store = await cookies()
  const locale = store.get('locale')?.value ?? 'pt-BR'
  const messages = getMessages(locale)
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Providers>
          <I18nProvider locale={locale} messages={messages}>
            {children}
          </I18nProvider>
        </Providers>
      </body>
    </html>
  )
}
