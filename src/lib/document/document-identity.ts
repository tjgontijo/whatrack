import { validateCnpj } from '@/lib/mask/cnpj'

export type IdentityType = 'pessoa_fisica' | 'pessoa_juridica'
export type DocumentType = 'cpf' | 'cnpj'

const IDENTITY_TO_DOCUMENT: Record<IdentityType, DocumentType> = {
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
  documentType: DocumentType,
  documentNumber: string | null | undefined
): boolean {
  const normalized = normalizeDocumentNumber(documentNumber)
  if (!normalized) return false

  if (documentType === 'cpf') {
    return validateCpf(normalized)
  }

  return validateCnpj(normalized)
}

export function validateIdentityDocument(input: {
  identityType: IdentityType | null | undefined
  documentType: DocumentType | null | undefined
  documentNumber: string | null | undefined
}): { valid: true; normalizedDocument: string | null } | { valid: false; error: string } {
  const { identityType, documentType, documentNumber } = input
  const normalizedDocument = normalizeDocumentNumber(documentNumber)

  if (!identityType && !documentType && !normalizedDocument) {
    return { valid: true, normalizedDocument: null }
  }

  if (!identityType || !documentType) {
    return {
      valid: false,
      error: 'identityType e documentType são obrigatórios quando houver documento.',
    }
  }

  const expectedDocumentType = IDENTITY_TO_DOCUMENT[identityType]
  if (expectedDocumentType !== documentType) {
    return {
      valid: false,
      error: `documentType inválido para ${identityType}. Esperado: ${expectedDocumentType}.`,
    }
  }

  if (!normalizedDocument) {
    return {
      valid: false,
      error: 'documentNumber é obrigatório quando identityType/documentType forem informados.',
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
