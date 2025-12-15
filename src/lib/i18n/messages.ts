import ptBR from './locales/pt-BR.json'
import enUS from './locales/en-US.json'
import esES from './locales/es-ES.json'

type Messages = Record<string, string>

const MAP: Record<string, Messages> = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-ES': esES,
}

export function getMessages(locale: string): Messages {
  return MAP[locale] ?? ptBR
}

export type { Messages }
