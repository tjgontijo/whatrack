/**
 * Utilitário para manipulação e validação de CNPJ
 *
 * Funções:
 * - formatCnpj: Aplica máscara XX.XXX.XXX/XXXX-XX
 * - stripCnpj: Remove caracteres não numéricos
 * - validateCnpj: Valida CNPJ com algoritmo de dígitos verificadores
 * - isValidCnpjFormat: Verifica se string tem formato válido
 */

/**
 * Remove todos os caracteres não numéricos do CNPJ
 */
export function stripCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return ''
  return cnpj.replace(/\D/g, '')
}

/**
 * Aplica máscara de CNPJ: XX.XXX.XXX/XXXX-XX
 * Aceita entrada parcial e formata progressivamente
 */
export function formatCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return ''

  const digits = stripCnpj(cnpj)

  if (digits.length <= 2) {
    return digits
  }

  if (digits.length <= 5) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`
  }

  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  }

  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  }

  // 13+ dígitos
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`
}

/**
 * Verifica se o CNPJ tem formato válido (14 dígitos ou com máscara)
 */
export function isValidCnpjFormat(cnpj: string | null | undefined): boolean {
  if (!cnpj) return false

  const digits = stripCnpj(cnpj)

  // CNPJ deve ter exatamente 14 dígitos
  return digits.length === 14
}

/**
 * Valida CNPJ usando algoritmo de dígitos verificadores
 * Referência: https://www.macoratti.net/alg_cnpj.htm
 */
export function validateCnpj(cnpj: string | null | undefined): boolean {
  if (!cnpj) return false

  const digits = stripCnpj(cnpj)

  // CNPJ deve ter 14 dígitos
  if (digits.length !== 14) return false

  // Rejeita CNPJs com todos os dígitos iguais
  if (/^(\d)\1{13}$/.test(digits)) return false

  // Cálculo do primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let sum = 0

  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i], 10) * weights1[i]
  }

  let remainder = sum % 11
  const digit1 = remainder < 2 ? 0 : 11 - remainder

  if (parseInt(digits[12], 10) !== digit1) return false

  // Cálculo do segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  sum = 0

  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits[i], 10) * weights2[i]
  }

  remainder = sum % 11
  const digit2 = remainder < 2 ? 0 : 11 - remainder

  return parseInt(digits[13], 10) === digit2
}
