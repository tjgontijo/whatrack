import { describe, expect, it } from 'vitest'
import {
  whatsappCampaignCreateSchema,
  whatsappCampaignUpdateSchema,
  whatsappCampaignListQuerySchema,
  whatsappCampaignPreviewAudienceSchema,
  whatsappCampaignApproveSchema,
  whatsappCampaignDispatchSchema,
  whatsappCampaignCancelSchema,
  whatsappCampaignImportSchema,
} from '@/schemas/whatsapp/whatsapp-campaign-schemas'

describe('whatsapp-campaign-schemas', () => {
  describe('whatsappCampaignCreateSchema', () => {
    it('accepts valid minimal campaign', () => {
      const result = whatsappCampaignCreateSchema.safeParse({
        name: 'Campanha Teste',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.success).toBe(true)
    })

    it('accepts full campaign with dispatch groups', () => {
      const result = whatsappCampaignCreateSchema.safeParse({
        name: 'Campanha Full',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'MARKETING',
        templateName: 'hello_world',
        templateLang: 'pt_BR',
        dispatchGroups: [
          {
            configId: '660e8400-e29b-41d4-a716-446655440001',
            templateName: 'hello_world',
            templateLang: 'pt_BR',
            order: 0,
          },
        ],
        audience: {
          source: 'CRM',
          crmFilters: { isActive: true },
        },
      })
      expect(result.success).toBe(true)
    })

    it('rejects campaign without name', () => {
      const result = whatsappCampaignCreateSchema.safeParse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.success).toBe(false)
    })

    it('rejects campaign without projectId', () => {
      const result = whatsappCampaignCreateSchema.safeParse({
        name: 'Test',
      })
      expect(result.success).toBe(false)
    })

    it('accepts import audience', () => {
      const result = whatsappCampaignCreateSchema.safeParse({
        name: 'Import Campaign',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        audience: {
          source: 'IMPORT',
          importedPhones: ['5511999999999', '5511888888888'],
        },
      })
      expect(result.success).toBe(true)
    })

    it('accepts mixed audience', () => {
      const result = whatsappCampaignCreateSchema.safeParse({
        name: 'Mixed Campaign',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        audience: {
          source: 'MIXED',
          crmFilters: { isActive: true, stageId: '770e8400-e29b-41d4-a716-446655440002' },
          importedPhones: ['5511999999999'],
        },
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid campaign type', () => {
      const result = whatsappCampaignCreateSchema.safeParse({
        name: 'Test',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'INVALID',
      })
      expect(result.success).toBe(false)
    })

    it('rejects imported phones in spreadsheet scientific notation', () => {
      const result = whatsappCampaignCreateSchema.safeParse({
        name: 'Import Campaign',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        audience: {
          source: 'IMPORT',
          importedPhones: ['5,56198E+12'],
        },
      })

      expect(result.success).toBe(false)
    })
  })

  describe('whatsappCampaignDispatchSchema', () => {
    it('accepts immediate dispatch', () => {
      const result = whatsappCampaignDispatchSchema.safeParse({ immediate: true })
      expect(result.success).toBe(true)
    })

    it('accepts scheduled dispatch', () => {
      const result = whatsappCampaignDispatchSchema.safeParse({
        immediate: false,
        scheduledAt: '2026-12-25T10:00:00.000Z',
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid scheduledAt', () => {
      const result = whatsappCampaignDispatchSchema.safeParse({
        immediate: false,
        scheduledAt: 'not-a-date',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('whatsappCampaignImportSchema', () => {
    it('accepts valid import', () => {
      const result = whatsappCampaignImportSchema.safeParse({
        campaignId: '550e8400-e29b-41d4-a716-446655440000',
        rows: [
          { phone: '5511999999999' },
          { phone: '5511888888888', variables: [{ name: 'name', value: 'João' }] },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty rows', () => {
      const result = whatsappCampaignImportSchema.safeParse({
        campaignId: '550e8400-e29b-41d4-a716-446655440000',
        rows: [],
      })
      expect(result.success).toBe(false)
    })

    it('rejects phones in spreadsheet scientific notation', () => {
      const result = whatsappCampaignImportSchema.safeParse({
        campaignId: '550e8400-e29b-41d4-a716-446655440000',
        rows: [{ phone: '5,56198E+12' }],
      })

      expect(result.success).toBe(false)
    })
  })

  describe('whatsappCampaignListQuerySchema', () => {
    it('accepts empty query', () => {
      const result = whatsappCampaignListQuerySchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('accepts filters', () => {
      const result = whatsappCampaignListQuerySchema.safeParse({
        status: 'PROCESSING',
        type: 'MARKETING',
        page: 2,
        pageSize: 50,
      })
      expect(result.success).toBe(true)
    })

    it('coerces page to number', () => {
      const result = whatsappCampaignListQuerySchema.safeParse({ page: '3' })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.page).toBe(3)
    })
  })
})
