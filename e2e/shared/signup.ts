import { Page } from '@playwright/test'
import { faker } from '@faker-js/faker'

export interface SignUpData {
  name: string
  email: string
  password: string
  documentType?: 'CPF' | 'CNPJ'
  documentNumber?: string
}

function calculateCpfCheckDigit(baseDigits: number[]) {
  const weightStart = baseDigits.length + 1
  const sum = baseDigits.reduce((acc, digit, index) => acc + digit * (weightStart - index), 0)
  const remainder = (sum * 10) % 11
  return remainder === 10 ? 0 : remainder
}

export function generateTestCpf(): string {
  const seed = `${Date.now()}${Math.floor(Math.random() * 1000)}`.replace(/\D/g, '')
  const base = seed
    .slice(-9)
    .padStart(9, '0')
    .split('')
    .map((digit) => Number(digit))

  const firstCheckDigit = calculateCpfCheckDigit(base)
  const secondCheckDigit = calculateCpfCheckDigit([...base, firstCheckDigit])

  return [...base, firstCheckDigit, secondCheckDigit].join('')
}

export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`
}

export function generateTestPassword(): string {
  return `Test${Date.now()}!@#`
}

export function generateTestName(): string {
  const rawName = `${faker.person.firstName()} ${faker.person.lastName()}`
  const sanitized = rawName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return sanitized || 'Test User'
}

export async function signUp(page: Page, data: SignUpData) {
  await page.goto('/sign-up')

  // Fill form
  await page.fill('input[name="name"]', data.name)
  await page.fill('input[name="email"]', data.email)

  // Select document type if provided, or infer CPF when only documentNumber is set.
  const resolvedDocumentType = data.documentType ?? (data.documentNumber ? 'CPF' : undefined)

  if (resolvedDocumentType) {
    const docTypeButton = page.getByRole('button', { name: resolvedDocumentType }).first()
    await docTypeButton.click()

    const resolvedDocumentNumber =
      data.documentNumber ??
      (resolvedDocumentType === 'CPF' ? generateTestCpf() : '11222333000181')
    await page.fill('input[name="documentNumber"]', resolvedDocumentNumber)
  }

  // Fill password
  await page.fill('input[name="password"]', data.password)
  await page.fill('input[name="confirmPassword"]', data.password)

  // Submit form
  const submitButton = page.locator('button[type="submit"]')
  await submitButton.click()
}

export async function waitForSignUpSuccess(page: Page, timeout = 60000) {
  // Default flow redirects to checkout. Trial flow redirects to welcome.
  try {
    await page.waitForURL(/\/(checkout|welcome|billing\/success)(\/|$|\?)/, { timeout })
  } catch (error) {
    const alerts = (await page.locator('[role="alert"]').allTextContents())
      .map((text) => text.trim())
      .filter(Boolean)
    const toastCandidates = await page
      .locator('[data-sonner-toast], [data-rich-colors], [role="status"]')
      .allTextContents()
    const toasts = toastCandidates.map((text) => text.trim()).filter(Boolean)

    const debug = [
      `currentUrl=${page.url()}`,
      `alerts=${alerts.join(' | ') || 'none'}`,
      `toasts=${toasts.join(' | ') || 'none'}`,
    ].join(' ; ')

    throw new Error(`Sign-up did not redirect in ${timeout}ms. ${debug}`, {
      cause: error,
    })
  }
}

export async function verifyAccountCreated(page: Page, email: string) {
  // Check if we can find the user email in the page
  const userEmail = page.locator(`text=${email}`)
  return userEmail.isVisible().catch(() => false)
}
