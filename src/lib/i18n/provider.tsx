'use client'
import { createContext, useContext, useMemo } from 'react'
import type { Messages } from './messages'

type I18nContextType = { locale: string; messages: Messages; t: (key: string) => string }

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: string
  messages: Messages
  children: React.ReactNode
}) {
  const value = useMemo(
    () => ({ locale, messages, t: (key: string) => messages[key] ?? key }),
    [locale, messages]
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('I18nProvider')
  return ctx
}
