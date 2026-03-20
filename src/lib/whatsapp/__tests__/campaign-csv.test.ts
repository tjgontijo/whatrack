import { describe, expect, it } from 'vitest'

import {
  buildCampaignCsvPreview,
  buildCampaignTemplateCsvModel,
  parseCampaignCsv,
  validateCampaignCsvModel,
} from '@/lib/whatsapp/campaign-csv'

describe('campaign-csv', () => {
  it('parses csv with quoted values', () => {
    const text = 'telefone,nome,produto\n"5511999999999","Maria","Plano, Premium"'
    const result = parseCampaignCsv(text)

    expect(result.columns).toEqual(['telefone', 'nome', 'produto'])
    expect(result.rows).toEqual([
      {
        telefone: '5511999999999',
        nome: 'Maria',
        produto: 'Plano, Premium',
      },
    ])
  })

  it('builds preview with duplicates and invalid rows', () => {
    const rows = [
      { telefone: '5511999999999', nome: 'Maria', cupom: 'A1' },
      { telefone: '', nome: 'Sem telefone', cupom: 'B2' },
      { telefone: '55 11 99999-9999', nome: 'Duplicado', cupom: 'C3' },
      { telefone: '5511888888888', nome: 'Joao', cupom: 'D4' },
    ]

    const result = buildCampaignCsvPreview(
      rows,
      {
        phoneColumn: 'telefone',
        variableColumns: { nome: 'nome', cupom: 'cupom' },
      },
      ['nome', 'cupom'],
    )

    expect(result.totalRows).toBe(4)
    expect(result.validRows).toBe(2)
    expect(result.invalidRows).toBe(1)
    expect(result.duplicates).toBe(1)
    expect(result.mappedRecipients).toEqual([
      {
        phone: '5511999999999',
        variables: [
          { name: 'nome', value: 'Maria' },
          { name: 'cupom', value: 'A1' },
        ],
      },
      {
        phone: '5511888888888',
        variables: [
          { name: 'nome', value: 'Joao' },
          { name: 'cupom', value: 'D4' },
        ],
      },
    ])
  })

  it('marks spreadsheet scientific notation phone numbers as invalid', () => {
    const rows = [
      { telefone: '5,56198E+12', nome: 'Maria' },
      { telefone: '5511888888888', nome: 'Joao' },
    ]

    const result = buildCampaignCsvPreview(
      rows,
      {
        phoneColumn: 'telefone',
        variableColumns: { nome: 'nome' },
      },
      ['nome'],
    )

    expect(result.validRows).toBe(1)
    expect(result.invalidRows).toBe(1)
    expect(result.mappedRecipients).toEqual([
      {
        phone: '5511888888888',
        variables: [{ name: 'nome', value: 'Joao' }],
      },
    ])
  })

  it('builds a csv model from template variables', () => {
    const result = buildCampaignTemplateCsvModel([
      'nome_do_cliente',
      'numero_do_pedido',
      'link_google_drive',
    ])

    expect(result).toBe('telefone;nome_do_cliente;numero_do_pedido;link_google_drive')
  })

  it('validates a csv using the template model contract', () => {
    const parsed = parseCampaignCsv(
      'telefone;nome_do_cliente;numero_do_pedido\n5511999999999;Maria;123',
    )

    const result = validateCampaignCsvModel(parsed, ['nome_do_cliente', 'numero_do_pedido'])

    expect(result).toEqual({
      phoneColumn: 'telefone',
      variableColumns: {
        nome_do_cliente: 'nome_do_cliente',
        numero_do_pedido: 'numero_do_pedido',
      },
    })
  })

  it('rejects csv outside the expected model', () => {
    const parsed = parseCampaignCsv('phone;name\n5511999999999;Maria')

    expect(() => validateCampaignCsvModel(parsed, ['nome_do_cliente'])).toThrow(
      'CSV fora do padrão do modelo. Baixe o modelo e envie o arquivo novamente.',
    )
  })
})
