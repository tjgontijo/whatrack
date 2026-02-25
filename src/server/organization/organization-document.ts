import { validateCnpj } from '@/lib/mask/cnpj'

export type OrganizationType = 'pessoa_fisica' | 'pessoa_juridica'
export type OrganizationDocumentType = 'cpf' | 'cnpj'

const ORGANIZATION_TO_DOCUMENT: Record<OrganizationType, OrganizationDocumentType> = {
  pessoa_fisica: 'cpf',
  pessoa_juridica: 'cnpj',
}

export function normalizeDocumentNumber(value: string | null | undefined): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  return digits.length > 0 ? digits : null
}

function validateCpf(cpf: string | null | undefined): boolean {
  if (!cpf) return false
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * (10 - i)
  }

  let firstCheck = (sum * 10) % 11
  if (firstCheck === 10) firstCheck = 0
  if (firstCheck !== Number(digits[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += Number(digits[i]) * (11 - i)
  }

  let secondCheck = (sum * 10) % 11
  if (secondCheck === 10) secondCheck = 0

  return secondCheck === Number(digits[10])
}

export function validateDocumentByType(
  documentType: OrganizationDocumentType,
  documentNumber: string | null | undefined
): boolean {
  const normalized = normalizeDocumentNumber(documentNumber)
  if (!normalized) return false

  if (documentType === 'cpf') {
    return validateCpf(normalized)
  }

  return validateCnpj(normalized)
}

export function validateOrganizationIdentity(input: {
  organizationType: OrganizationType | null | undefined
  documentType: OrganizationDocumentType | null | undefined
  documentNumber: string | null | undefined
}): { valid: true; normalizedDocument: string | null } | { valid: false; error: string } {
  const { organizationType, documentType, documentNumber } = input
  const normalizedDocument = normalizeDocumentNumber(documentNumber)

  if (!organizationType && !documentType && !normalizedDocument) {
    return { valid: true, normalizedDocument: null }
  }

  if (!organizationType || !documentType) {
    return {
      valid: false,
      error: 'organizationType e documentType são obrigatórios quando houver documento.',
    }
  }

  const expectedDocumentType = ORGANIZATION_TO_DOCUMENT[organizationType]
  if (expectedDocumentType !== documentType) {
    return {
      valid: false,
      error: `documentType inválido para ${organizationType}. Esperado: ${expectedDocumentType}.`,
    }
  }

  if (!normalizedDocument) {
    return {
      valid: false,
      error: 'documentNumber é obrigatório quando organizationType/documentType forem informados.',
    }
  }

  if (!validateDocumentByType(documentType, normalizedDocument)) {
    return {
      valid: false,
      error: `Documento ${documentType.toUpperCase()} inválido.`,
    }
  }

  return { valid: true, normalizedDocument }
}
