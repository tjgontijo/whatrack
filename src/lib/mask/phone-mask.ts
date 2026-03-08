/**
 * Máscara para WhatsApp no formato brasileiro
 * Usuário digita: (11) 98888-8888
 * Armazena: 5511988888888 (com 55 + DDD + número local)
 */

export const WHATSAPP_MASK_MAX_LENGTH = '(11) 98888-8888'.length

/**
 * Aplica máscara visual no input (sem o código do país)
 * @param value - Valor do input
 * @returns Valor formatado para exibição: (11) 98888-8888
 */
export function applyWhatsAppMask(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '')

  if (!numbers) return ''

  // Limita a 11 dígitos
  const limited = numbers.slice(0, 11)

  // Aplica a máscara progressivamente
  if (limited.length <= 2) {
    return limited.replace(/(\d{0,2})/, '($1')
  }
  if (limited.length <= 6) {
    return limited.replace(/(\d{2})(\d{0,4})/, '($1) $2')
  }
  if (limited.length <= 10) {
    return limited.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  }
  // 11 dígitos (celular com 9)
  return limited.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

/**
 * Remove a máscara e retorna apenas números
 * @param value - Valor formatado
 * @returns Apenas números (formato para salvar no banco)
 */
export function removeWhatsAppMask(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Valida se o WhatsApp está no formato correto
 * @param value - Valor sem máscara (apenas números do DDD + número)
 * @returns true se válido
 */
export function validateWhatsApp(value: string): boolean {
  // Remove qualquer caractere não numérico
  const numbers = value.replace(/\D/g, '')

  // Deve ter 10 ou 11 dígitos (DDD + número)
  // 10 dígitos: DDD (2) + número (8) - sem nono dígito (números antigos)
  // 11 dígitos: DDD (2) + 9 + número (8) - com nono dígito (padrão atual)
  if (numbers.length < 10 || numbers.length > 11) {
    return false
  }

  return true
}

/**
 * Normaliza o WhatsApp para salvar no banco
 * Adiciona 55 no início e MANTÉM o nono dígito
 * @param value - Valor com ou sem máscara (DDD + número)
 * @returns Formato normalizado: 5511988888888 (13 dígitos com 55 + DDD + 9 + número)
 */
export function normalizeWhatsApp(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '')

  // Se tiver 11 dígitos (DDD + 9 + número), adiciona 55
  if (numbers.length === 11) {
    return '55' + numbers // 55 + 61982482100 = 5561982482100 (13 dígitos)
  }

  // Se tiver 10 dígitos (DDD + número sem o 9), adiciona 55
  if (numbers.length === 10) {
    return '55' + numbers // 55 + 6182482100 = 556182482100 (12 dígitos)
  }

  // Caso contrário, adiciona 55 no que vier
  return '55' + numbers
}

/**
 * Converte o WhatsApp do formato do banco para formato de exibição
 * @param value - Valor do banco (com DDI no início)
 * @returns Formato para exibição sem máscara: DDD + número (ex: 61982482100)
 */
export function denormalizeWhatsApp(value: string): string {
  if (!value) return ''

  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '')

  // Se começar com 55 (Brasil)
  if (numbers.startsWith('55')) {
    // 13 dígitos: 55 + DDD (2) + 9 + número (8) = 5561982482100
    if (numbers.length === 13) {
      return numbers.slice(2) // Remove o 55, fica: 61982482100 (11 dígitos)
    }
    // 12 dígitos: 55 + DDD (2) + número (8) = 556182482100 (sem o 9)
    if (numbers.length === 12) {
      return numbers.slice(2) // Remove o 55, fica: 6182482100 (10 dígitos)
    }
  }

  // Para outros países ou formatos, retorna sem o DDI se detectado
  // Tenta remover DDIs conhecidos
  for (let i = 3; i >= 1; i--) {
    const possibleDdi = numbers.slice(0, i)
    if (
      ['1', '33', '34', '39', '44', '49', '51', '52', '54', '56', '57', '58', '351'].includes(
        possibleDdi
      )
    ) {
      return numbers.slice(i)
    }
  }

  return numbers
}

/**
 * Mapeia DDI para bandeira do país (emoji)
 */
const countryFlags: Record<string, string> = {
  '55': '🇧🇷', // Brasil
  '1': '🇺🇸', // EUA/Canadá
  '44': '🇬🇧', // Reino Unido
  '351': '🇵🇹', // Portugal
  '34': '🇪🇸', // Espanha
  '33': '🇫🇷', // França
  '49': '🇩🇪', // Alemanha
  '39': '🇮🇹', // Itália
  '54': '🇦🇷', // Argentina
  '52': '🇲🇽', // México
  '56': '🇨🇱', // Chile
  '57': '🇨🇴', // Colômbia
  '58': '🇻🇪', // Venezuela
  '51': '🇵🇪', // Peru
}

/**
 * Extrai o DDI e retorna a bandeira do país
 * @param value - Número completo com DDI (ex: 556182493200)
 * @returns Bandeira do país ou string vazia
 */
export function getCountryFlag(value: string): string {
  if (!value) return ''

  const numbers = value.replace(/\D/g, '')

  // Tenta DDIs de 3 dígitos primeiro
  for (let i = 3; i >= 1; i--) {
    const ddi = numbers.slice(0, i)
    if (countryFlags[ddi]) {
      return countryFlags[ddi]
    }
  }

  return ''
}

/**
 * Formata WhatsApp completo com bandeira e número formatado
 * @param value - Número do banco (ex: 556182493200)
 * @returns Formato: 🇧🇷 +55 (61) 8249-3200
 */
export function formatWhatsAppWithFlag(value: string): string {
  if (!value || value === 'Não informado') return value

  const numbers = value.replace(/\D/g, '')

  // Detectar DDI
  let ddi = ''
  let localNumber = ''

  if (numbers.startsWith('55') && numbers.length === 12) {
    ddi = '55'
    localNumber = numbers.slice(2) // Remove DDI
  } else if (numbers.startsWith('1') && numbers.length === 11) {
    ddi = '1'
    localNumber = numbers.slice(1)
  } else {
    // Tenta detectar outros DDIs
    for (let i = 3; i >= 1; i--) {
      const testDdi = numbers.slice(0, i)
      if (countryFlags[testDdi]) {
        ddi = testDdi
        localNumber = numbers.slice(i)
        break
      }
    }
  }

  const flag = getCountryFlag(ddi)

  // Formatar número local baseado no país
  if (ddi === '55') {
    // Brasil: (DD) DDDD-DDDD
    const formatted = applyWhatsAppMask(localNumber)
    return `${flag} +${ddi} ${formatted}`
  }

  // Outros países: formato genérico
  return `${flag} +${ddi} ${localNumber}`
}
