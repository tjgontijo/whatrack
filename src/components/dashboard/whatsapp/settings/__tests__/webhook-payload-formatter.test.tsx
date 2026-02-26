import {
  formatPhoneNumber,
  translateAccountEvent,
  translateMessageType,
  translateStatus,
} from '@/components/dashboard/whatsapp/settings/webhook-payload-formatter'

describe('webhook payload formatter helpers', () => {
  it('translates known message types', () => {
    expect(translateMessageType('image')).toBe('Imagem')
  })

  it('keeps unknown message types with capitalized first letter', () => {
    expect(translateMessageType('custom_type')).toBe('Custom_type')
  })

  it('translates known statuses', () => {
    expect(translateStatus('read')).toBe('Lido')
  })

  it('returns unknown statuses as-is', () => {
    expect(translateStatus('queued')).toBe('queued')
  })

  it('translates known account events', () => {
    expect(translateAccountEvent('VERIFIED_ACCOUNT')).toBe('Conta verificada')
  })

  it('returns N/A for empty phone number', () => {
    expect(formatPhoneNumber('')).toBe('N/A')
  })
})
