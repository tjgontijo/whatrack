import { Page } from '@playwright/test'

export const ASAAS_TEST_CARDS = {
  // Valid test cards
  APPROVED: '4111111111111111',
  APPROVED_WITH_3DS: '4000002500000003',

  // Declined test cards
  DECLINED: '4000000000000002',
  INVALID_FORMAT: '4000000000000069',
  INSUFFICIENT_FUNDS: '5555555555554444',
}

export const TEST_CPF = '12345678901'
export const TEST_EMAIL = 'test@asaas.com'
export const TEST_FULL_NAME = 'Test User'

interface CardFillOptions {
  number: string
  expiry?: string
  cvc?: string
}

export async function fillCardDetails(page: Page, options: CardFillOptions) {
  const { number, expiry = '12/25', cvc = '123' } = options

  // Try to find card iframe (different payment providers have different structures)
  const frames = page.frames()

  for (const frame of frames) {
    try {
      const numberInput = frame.locator('input[name="cardNumber"], input[name="number"], input[placeholder*="Card"]').first()
      if (await numberInput.isVisible({ timeout: 500 })) {
        await numberInput.fill(number)
        await frame.locator('input[name="expiry"], input[placeholder*="MM/YY"]').first().fill(expiry)
        await frame.locator('input[name="cvc"], input[placeholder*="CVC"]').first().fill(cvc)
        return
      }
    } catch {
      // Continue to next frame
    }
  }

  // Fallback: try direct page selectors
  await page.fill('input[name="cardNumber"]', number)
  await page.fill('input[name="expiry"]', expiry)
  await page.fill('input[name="cvc"]', cvc)
}

export async function fillBillingInfo(page: Page, overrides?: Record<string, string>) {
  const data = {
    fullName: TEST_FULL_NAME,
    email: TEST_EMAIL,
    cpf: TEST_CPF,
    ...overrides,
  }

  await page.fill('input[name="fullName"]', data.fullName)
  await page.fill('input[name="email"]', data.email)
  await page.fill('input[name="cpf"]', data.cpf)
}

export async function completeCheckout(page: Page) {
  await page.click('button:has-text("Complete Purchase"), button:has-text("Pay Now"), button:has-text("Process Payment")')
}

export async function waitForPaymentSuccess(page: Page, timeout = 15000) {
  await page.waitForURL('**/checkout/success', { timeout })
}

export async function waitForPaymentError(page: Page, timeout = 10000) {
  await page.waitForURL('**/checkout?*error*', { timeout })
}

export async function create3DSecureVerification(page: Page) {
  const secureFrame = page.frameLocator('iframe[title*="3D"], iframe[title*="Secure"], iframe[src*="3ds"]').first()
  return secureFrame
}

export async function getInvoiceAmount(page: Page): Promise<number> {
  const amountText = await page.locator('[data-testid="invoice-amount"]').textContent()
  const amount = parseFloat(amountText?.replace(/[^\d.]/g, '') || '0')
  return amount
}

export async function getProratingDetails(page: Page) {
  const credit = await page.locator('[data-testid="credit-amount"]').textContent()
  const charge = await page.locator('[data-testid="charge-amount"]').textContent()
  const net = await page.locator('[data-testid="net-amount"]').textContent()

  return {
    credit: parseFloat(credit?.replace(/[^\d.]/g, '') || '0'),
    charge: parseFloat(charge?.replace(/[^\d.]/g, '') || '0'),
    net: parseFloat(net?.replace(/[^\d.]/g, '') || '0'),
  }
}

export async function verifyProratingMath(page: Page) {
  const { credit, charge, net } = await getProratingDetails(page)
  const calculatedNet = charge - credit
  return Math.abs(calculatedNet - net) < 0.01 // Allow small floating point diff
}
