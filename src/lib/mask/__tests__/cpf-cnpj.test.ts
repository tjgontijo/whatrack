import { describe, expect, it } from 'vitest'

import { applyCpfCnpjMask, formatCpf, stripCpfCnpj } from '../cpf-cnpj'

describe('cpf-cnpj mask helpers', () => {
  it('removes non-numeric characters', () => {
    expect(stripCpfCnpj('123.456.789-01')).toBe('12345678901')
    expect(stripCpfCnpj('12.345.678/0001-90')).toBe('12345678000190')
  })

  it('formats cpf progressively', () => {
    expect(formatCpf('123')).toBe('123')
    expect(formatCpf('12345')).toBe('123.45')
    expect(formatCpf('1234567890')).toBe('123.456.789-0')
    expect(formatCpf('12345678901')).toBe('123.456.789-01')
  })

  it('formats by explicit type', () => {
    expect(applyCpfCnpjMask('12345678901', 'cpf')).toBe('123.456.789-01')
    expect(applyCpfCnpjMask('12345678000190', 'cnpj')).toBe('12.345.678/0001-90')
  })

  it('infers format when type is not provided', () => {
    expect(applyCpfCnpjMask('12345678901', null)).toBe('123.456.789-01')
    expect(applyCpfCnpjMask('12345678000190', undefined)).toBe('12.345.678/0001-90')
  })
})
