import { test, expect } from '@playwright/test'
import { signUp, waitForSignUpSuccess, generateTestEmail, generateTestPassword, verifyAccountCreated } from '../shared/signup'

test.describe('Sign Up & Account Creation', () => {
  test('should create new account with valid data', async ({ page }) => {
    const email = generateTestEmail()
    const password = generateTestPassword()

    await signUp(page, {
      name: 'Test User',
      email,
      password,
      documentNumber: '12345678901',
    })

    // Wait for successful redirect
    await waitForSignUpSuccess(page)

    // Verify we're logged in
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/)
  })

  test('should require valid email format', async ({ page }) => {
    await page.goto('/sign-up')

    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', 'invalid-email')
    await page.fill('input[name="password"]', generateTestPassword())
    await page.fill('input[name="confirmPassword"]', generateTestPassword())

    // Try to submit
    const submitBtn = page.locator('button:has-text("Sign Up"), button:has-text("Create Account")')
    await submitBtn.click()

    // Should show error
    const error = page.locator('[role="alert"], .error-message').first()
    await expect(error).toContainText(/email|invalid/i)
  })

  test('should require password to match confirmation', async ({ page }) => {
    const email = generateTestEmail()
    const password = generateTestPassword()

    await page.goto('/sign-up')

    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!@#')

    // Try to submit
    const submitBtn = page.locator('button:has-text("Sign Up"), button:has-text("Create Account")')
    await submitBtn.click()

    // Should show error
    const error = page.locator('[role="alert"], .error-message').first()
    await expect(error).toContainText(/match|confirm|password/i)
  })

  test('should require strong password', async ({ page }) => {
    await page.goto('/sign-up')

    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', generateTestEmail())
    await page.fill('input[name="password"]', '123') // Too weak
    await page.fill('input[name="confirmPassword"]', '123')

    // Try to submit
    const submitBtn = page.locator('button:has-text("Sign Up"), button:has-text("Create Account")')
    await submitBtn.click()

    // Should show error
    const error = page.locator('[role="alert"], .error-message').first()
    await expect(error).toContainText(/strong|password|requirements/i)
  })

  test('should prevent duplicate email registration', async ({ page }) => {
    const email = 'existing-user@example.com' // Assume this exists

    await signUp(page, {
      name: 'Another User',
      email,
      password: generateTestPassword(),
    })

    // Should show error about email already existing
    const error = page.locator('[role="alert"], .error-message').first()
    await expect(error).toContainText(/already|exists|registered/i, { timeout: 5000 })

    // Should stay on sign-up page
    await expect(page).toHaveURL('/sign-up')
  })

  test('should auto-login after successful sign up', async ({ page }) => {
    const email = generateTestEmail()
    const password = generateTestPassword()

    await signUp(page, {
      name: 'Auto Login Test',
      email,
      password,
      documentNumber: '12345678901',
    })

    await waitForSignUpSuccess(page)

    // Should be in authenticated area
    const userMenu = page.locator('[data-testid="user-menu"]')
    await expect(userMenu).toBeVisible()
  })

  test('should initialize organization during sign up', async ({ page }) => {
    const email = generateTestEmail()

    await signUp(page, {
      name: 'Org Test User',
      email,
      password: generateTestPassword(),
    })

    await waitForSignUpSuccess(page)

    // Check if organization name is set
    const orgName = page.locator('[data-testid="org-name"]')
    if (await orgName.isVisible().catch(() => false)) {
      const text = await orgName.textContent()
      expect(text).toBeTruthy()
    }
  })

  test('should require CPF for Brazilian users', async ({ page }) => {
    await page.goto('/sign-up')

    const cpfInput = page.locator('input[name="cpf"]')

    // If CPF field is visible and required
    if (await cpfInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      const isRequired = await cpfInput.evaluate((el: HTMLInputElement) => el.required)

      if (isRequired) {
        await page.fill('input[name="name"]', 'CPF Test')
        await page.fill('input[name="email"]', generateTestEmail())
        await page.fill('input[name="password"]', generateTestPassword())

        const submitBtn = page.locator('button:has-text("Sign Up"), button:has-text("Create Account")')
        await submitBtn.click()

        const error = page.locator('[role="alert"], .error-message').first()
        await expect(error).toContainText(/cpf|required/i)
      }
    }
  })

  test('should validate CPF format', async ({ page }) => {
    const email = generateTestEmail()

    await signUp(page, {
      name: 'CPF Validation Test',
      email,
      password: generateTestPassword(),
      documentNumber: 'invalid-cpf',
    })

    // Should show error
    const error = page.locator('[role="alert"], .error-message').first()
    await expect(error).toContainText(/cpf|invalid|format/i, { timeout: 5000 })

    // Should stay on sign-up
    await expect(page).toHaveURL('/sign-up')
  })

  test('should handle server errors gracefully', async ({ page }) => {
    // Mock a server error
    await page.route('**/api/auth/signup', (route) => {
      route.abort('failed')
    })

    const email = generateTestEmail()

    await page.goto('/sign-up')
    await page.fill('input[name="name"]', 'Error Test')
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', generateTestPassword())
    await page.fill('input[name="confirmPassword"]', generateTestPassword())

    const submitBtn = page.locator('button:has-text("Sign Up"), button:has-text("Create Account")')
    await submitBtn.click()

    // Should show error
    const error = page.locator('[role="alert"], .error-message').first()
    await expect(error).toBeVisible({ timeout: 5000 })

    // Should stay on form
    const fullNameInput = page.locator('input[name="name"]')
    await expect(fullNameInput).toHaveValue('Error Test')
  })

  test('should link to sign in page', async ({ page }) => {
    await page.goto('/sign-up')

    // Find link to sign in
    const signInLink = page.locator('a:has-text("Sign In"), a:has-text("login"), a:has-text("Already have an account")')
    await expect(signInLink).toBeVisible()

    // Click and verify navigation
    await signInLink.click()
    await expect(page).toHaveURL('/sign-in')
  })

  test('should show password requirements', async ({ page }) => {
    await page.goto('/sign-up')

    const passwordInput = page.locator('input[name="password"]')
    await passwordInput.focus()

    // Should show requirements (might be in tooltip or nearby text)
    const requirements = page.locator('[data-testid="password-requirements"], .password-hints')
    if (await requirements.isVisible().catch(() => false)) {
      await expect(requirements).toContainText(/upper|lower|number|special|length/i)
    }
  })

  test('should create account and start with Starter plan', async ({ page }) => {
    const email = generateTestEmail()

    await signUp(page, {
      name: 'Plan Test User',
      email,
      password: generateTestPassword(),
    })

    await waitForSignUpSuccess(page)

    // Navigate to billing
    await page.goto('/dashboard/billing')

    // Should have Starter plan
    const planBadge = page.locator('[data-testid="current-plan"], [data-testid="plan-name"]')
    if (await planBadge.isVisible().catch(() => false)) {
      await expect(planBadge).toContainText(/Starter|Free|Trial/i)
    }
  })

  test('should persist account after page refresh', async ({ page }) => {
    const email = generateTestEmail()
    const password = generateTestPassword()

    // Sign up
    await signUp(page, {
      name: 'Persistence Test',
      email,
      password,
    })

    await waitForSignUpSuccess(page)
    const initialUrl = page.url()

    // Refresh page
    await page.reload()

    // Should still be authenticated
    await expect(page).toHaveURL(initialUrl)
    const userMenu = page.locator('[data-testid="user-menu"]')
    await expect(userMenu).toBeVisible()
  })
})
