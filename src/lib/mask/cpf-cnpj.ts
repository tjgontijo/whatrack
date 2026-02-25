import { formatCnpj } from './cnpj'

export type CpfCnpjType = 'cpf' | 'cnpj'

export function stripCpfCnpj(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(/\D/g, '')
}

export function formatCpf(cpf: string | null | undefined): string {
  if (!cpf) return ''

  const digits = stripCpfCnpj(cpf).slice(0, 11)

  if (digits.length <= 3) {
    return digits
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

export function applyCpfCnpjMask(
  value: string | null | undefined,
  type: CpfCnpjType | null | undefined
): string {
  if (!value) return ''

  const digits = stripCpfCnpj(value)
  if (!digits) return ''

  if (type === 'cpf') {
    return formatCpf(digits)
  }

  if (type === 'cnpj') {
    return formatCnpj(digits)
  }

  return digits.length > 11 ? formatCnpj(digits) : formatCpf(digits)
}
