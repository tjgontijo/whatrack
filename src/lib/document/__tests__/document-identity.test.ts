import { describe, expect, it } from 'vitest'

import {
  validateDocumentByType,
  validateIdentityDocument,
} from '@/lib/document/document-identity'

describe('document identity validation', () => {
  it('validates CPF for pessoa_fisica', () => {
    const validation = validateIdentityDocument({
      identityType: 'pessoa_fisica',
      documentType: 'cpf',
      documentNumber: '529.982.247-25',
    })

    expect(validation.valid).toBe(true)
    if (validation.valid) {
      expect(validation.normalizedDocument).toBe('52998224725')
    }
  })

  it('validates CNPJ for pessoa_juridica', () => {
    const validation = validateIdentityDocument({
      identityType: 'pessoa_juridica',
      documentType: 'cnpj',
      documentNumber: '04.252.011/0001-10',
    })

    expect(validation.valid).toBe(true)
    if (validation.valid) {
      expect(validation.normalizedDocument).toBe('04252011000110')
    }
  })

  it('rejects mismatched identityType/documentType', () => {
    const validation = validateIdentityDocument({
      identityType: 'pessoa_fisica',
      documentType: 'cnpj',
      documentNumber: '04.252.011/0001-10',
    })

    expect(validation.valid).toBe(false)
  })

  it('rejects invalid documents by type', () => {
    expect(validateDocumentByType('cpf', '12345678900')).toBe(false)
    expect(validateDocumentByType('cnpj', '11111111111111')).toBe(false)
  })
})
