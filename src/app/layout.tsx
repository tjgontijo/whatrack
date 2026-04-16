import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import './globals.css'
import { cookies } from 'next/headers'
import { I18nProvider } from '@/lib/i18n/provider'
import { getMessages } from '@/lib/i18n/messages'
import Providers from '@/components/shared/providers'

export const metadata: Metadata = {
  title: 'WhaTrack | Rastreamento de vendas WhatsApp e Meta Ads',
  description:
    'O Meta entrega o lead no WhatsApp mas não sabe que você vendeu. O WhaTrack registra cada venda e devolve o dado ao algoritmo. CAC e ROAS reais por campanha e anúncio.',
  openGraph: {
    title: 'WhaTrack | Rastreamento de vendas WhatsApp e Meta Ads',
    description:
      'O Meta entrega o lead no WhatsApp mas não sabe que você vendeu. O WhaTrack registra cada venda e devolve o dado ao algoritmo. CAC e ROAS reais por campanha e anúncio.',
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
