import { Page } from '@playwright/test'

export interface SignUpData {
  name: string
  email: string
  password: string
  documentType?: 'CPF' | 'CNPJ'
  documentNumber?: string
}

export function generateTestEmail(): string {
  return `test-${Date.now()}@example.com`
}

export function generateTestPassword(): string {
  return `Test${Date.now()}!@#`
}

export async function signUp(page: Page, data: SignUpData) {
  await page.goto('/sign-up')

  // Fill form
  await page.fill('input[name="name"]', data.name)
  await page.fill('input[name="email"]', data.email)

  // Select document type if provided
  if (data.documentType) {
    const docTypeButton = page.locator(`button:has-text("${data.documentType}")`).first()
    await docTypeButton.click()

    // Fill document number
    if (data.documentNumber) {
      await page.fill('input[name="documentNumber"]', data.documentNumber)
    }
  }

  // Fill password
  await page.fill('input[name="password"]', data.password)
  await page.fill('input[name="confirmPassword"]', data.password)

  // Submit form
  const submitButton = page.locator('button[type="submit"]')
  await submitButton.click()
}

export async function waitForSignUpSuccess(page: Page, timeout = 10000) {
  // Wait for redirect to dashboard, welcome, or checkout
  await page.waitForURL('**/dashboard/**|**/welcome**|**/checkout**|**/verify-email/**', { timeout })
}

export async function verifyAccountCreated(page: Page, email: string) {
  // Check if we can find the user email in the page
  const userEmail = page.locator(`text=${email}`)
  return userEmail.isVisible().catch(() => false)
}
