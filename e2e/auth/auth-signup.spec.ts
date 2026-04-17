import { test, expect } from '@playwright/test'
import {
  generateTestEmail,
  generateTestCpf,
  generateTestName,
  generateTestPassword,
  signUp,
  waitForSignUpSuccess,
} from '../shared/signup'

test.describe('Sign Up', () => {
  test.setTimeout(120000)

  test('should render sign-up form', async ({ page }) => {
    await page.goto('/sign-up')

    await expect(page.getByTestId('sign-up-page')).toBeVisible()
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should validate invalid email', async ({ page }) => {
    await page.goto('/sign-up')

    await page.fill('input[name="name"]', generateTestName())
    await page.fill('input[name="email"]', 'email-invalido')
    await page.fill('input[name="password"]', generateTestPassword())
    await page.fill('input[name="confirmPassword"]', generateTestPassword())
    await page.getByRole('button', { name: 'CPF' }).click()
    await page.fill('input[name="documentNumber"]', generateTestCpf())
    await page.locator('button[type="submit"]').click()

    await expect(page.getByText(/email/i).first()).toBeVisible()
  })

  test('should require document type selection', async ({ page }) => {
    await page.goto('/sign-up')

    const password = generateTestPassword()
    await page.fill('input[name="name"]', 'Sem Documento')
    await page.fill('input[name="email"]', generateTestEmail())
    await page.fill('input[name="password"]', password)
    await page.fill('input[name="confirmPassword"]', password)
    await page.locator('button[type="submit"]').click()

    await expect(page.getByText(/selecione cpf ou cnpj/i)).toBeVisible()
  })

  test('should create account and redirect', async ({ page }) => {
    const name = generateTestName()
    await signUp(page, {
      name,
      email: generateTestEmail(),
      password: generateTestPassword(),
      documentType: 'CPF',
      documentNumber: generateTestCpf(),
    })

    await waitForSignUpSuccess(page, 90000)
    await expect(page).toHaveURL(/\/(checkout|welcome|billing\/success)(\/|$|\?)/)
  })

  test('should navigate to sign-in page from sign-up', async ({ page }) => {
    await page.goto('/sign-up')
    await page.getByRole('link', { name: /entrar na plataforma/i }).click()
    await expect(page).toHaveURL(/\/sign-in/)
  })
})
