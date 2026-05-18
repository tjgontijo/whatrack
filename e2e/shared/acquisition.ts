import { expect, type Page } from '@playwright/test'
import {
  ASAAS_TEST_CARDS,
  completeCheckout,
  fillCardDetails,
  waitForPaymentSuccess,
} from './billing'
import {
  generateTestCpf,
  generateTestEmail,
  generateTestName,
  generateTestPassword,
} from './signup'

function extractWorkspaceBasePath(currentUrl: string) {
  const url = new URL(currentUrl)
  const parts = url.pathname.split('/').filter(Boolean)

  if (parts.length < 2) {
    throw new Error(`Could not infer workspace path from URL: ${currentUrl}`)
  }

  return `/${parts[0]}/${parts[1]}`
}

async function goToSignUpFromPricing(page: Page) {
  const pricingSection = page.locator('#planos')
  await expect(pricingSection).toBeVisible({ timeout: 30000 })

  const ctaButton = pricingSection
    .getByRole('button')
    .filter({ hasText: /teste grátis|teste gratis|começar agora|comecar agora|assinar/i })
    .first()

  await expect(ctaButton).toBeVisible({ timeout: 30000 })

  await Promise.all([page.waitForURL(/\/sign-up(\?|$)/, { timeout: 45000 }), ctaButton.click()])

  await expect(
    page.getByTestId('sign-up-page'),
    `Expected sign-up page after pricing CTA. Current URL: ${page.url()}`
  ).toBeVisible({ timeout: 15000 })
  await expect(page).toHaveURL(/intent=checkout/, { timeout: 15000 })
}

export type CompletePaidJourneyResult = {
  name: string
  email: string
  password: string
  cpf: string
  workspaceBasePath: string
}

type BillingSubscriptionApiBody = {
  subscription?: {
    asaasId?: string | null
    asaasCustomerId?: string | null
    isActive?: boolean
  } | null
}

type AsaasDeleteResult = {
  ok: boolean
  status: number
  body: unknown
}

export type AcquisitionCleanupResult = {
  cancelApi: {
    attempted: boolean
    ok: boolean
    status: number | null
    body: unknown
  }
  asaas: {
    subscription: AsaasDeleteResult | null
    customer: AsaasDeleteResult | null
  }
  context: {
    asaasId: string | null
    asaasCustomerId: string | null
  }
}

function getAsaasRuntimeConfig() {
  const apiKey = (process.env.ASAAS_API_KEY || '').trim()
  const baseUrl = (process.env.ASAAS_BASE_URL || 'https://api-sandbox.asaas.com/v3')
    .trim()
    .replace(/\/+$/, '')

  return { apiKey, baseUrl }
}

async function parseJsonOrText(response: Response) {
  const text = await response.text().catch(() => '')
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function deleteInAsaas(path: string): Promise<AsaasDeleteResult> {
  const { apiKey, baseUrl } = getAsaasRuntimeConfig()

  if (!apiKey) {
    return {
      ok: false,
      status: 0,
      body: 'ASAAS_API_KEY não configurada no ambiente de teste',
    }
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: {
      access_token: apiKey,
      'Content-Type': 'application/json',
    },
  })

  const body = await parseJsonOrText(response)

  return {
    ok: response.ok || response.status === 404,
    status: response.status,
    body,
  }
}

export async function completePaidAcquisitionJourney(
  page: Page
): Promise<CompletePaidJourneyResult> {
  const name = generateTestName()
  const email = generateTestEmail()
  const password = generateTestPassword()
  const cpf = generateTestCpf()

  await page.goto('/')
  await goToSignUpFromPricing(page)

  await page.fill('input[name="name"]', name)
  await page.fill('input[name="email"]', email)
  await page.getByRole('button', { name: 'CPF' }).first().click()
  await page.fill('input[name="documentNumber"]', cpf)
  await page.fill('input[name="password"]', password)
  await page.fill('input[name="confirmPassword"]', password)

  const [authResponse, onboardingResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/auth') && response.request().method() === 'POST',
      { timeout: 60000 }
    ),
    page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/onboarding/setup') &&
        response.request().method() === 'POST',
      { timeout: 60000 }
    ),
    page.locator('button[type="submit"]').click(),
  ])

  const authBody = await authResponse.text().catch(() => '<failed-to-read-auth-response>')
  const onboardingBody = await onboardingResponse
    .text()
    .catch(() => '<failed-to-read-onboarding-response>')

  expect(
    authResponse.ok(),
    `Auth API failed with status ${authResponse.status()}: ${authBody}`
  ).toBeTruthy()
  expect(
    onboardingResponse.ok(),
    `Onboarding setup failed with status ${onboardingResponse.status()}: ${onboardingBody}`
  ).toBeTruthy()

  await page.waitForURL(/\/checkout(\?|$)/, { timeout: 90000 })
  await expect(page.getByRole('heading', { name: /Ative seu plano/i })).toBeVisible()

  await fillCardDetails(page, {
    number: ASAAS_TEST_CARDS.APPROVED,
    expiry: '12/30',
    cvc: '123',
    holderName: name,
  })

  const [checkoutResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/billing/checkout') &&
        response.request().method() === 'POST',
      { timeout: 90000 }
    ),
    completeCheckout(page),
  ])

  const checkoutBody = await checkoutResponse
    .text()
    .catch(() => '<failed-to-read-checkout-response>')
  expect(
    checkoutResponse.ok(),
    `Checkout API failed with status ${checkoutResponse.status()}: ${checkoutBody}`
  ).toBeTruthy()
  await waitForPaymentSuccess(page, 90000)

  const continueButton = page.getByRole('button', { name: /Continuar/i }).first()
  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click()
  }

  await page.waitForURL(/\/[^/]+\/default(\/|$|\?)/, { timeout: 30000 })

  return {
    name,
    email,
    password,
    cpf,
    workspaceBasePath: extractWorkspaceBasePath(page.url()),
  }
}

export async function cleanupAcquisitionAsaasResources(
  page: Page
): Promise<AcquisitionCleanupResult> {
  const subscriptionSnapshot = await getSubscriptionViaApi(page)
  const subscription = (subscriptionSnapshot.body ?? null) as BillingSubscriptionApiBody | null
  const asaasId = subscription?.subscription?.asaasId ?? null
  const asaasCustomerId = subscription?.subscription?.asaasCustomerId ?? null

  let cancelApiResult: AcquisitionCleanupResult['cancelApi'] = {
    attempted: false,
    ok: true,
    status: null,
    body: null,
  }

  if (subscription?.subscription?.isActive) {
    const cancelResponse = await page.request.post('/api/v1/billing/cancel', {
      data: { atPeriodEnd: false },
    })
    const cancelBody = await cancelResponse.json().catch(() => null)

    cancelApiResult = {
      attempted: true,
      ok: cancelResponse.ok(),
      status: cancelResponse.status(),
      body: cancelBody,
    }
  }

  const subscriptionDelete = asaasId
    ? await deleteInAsaas(`/subscriptions/${encodeURIComponent(asaasId)}`)
    : null

  const customerDelete = asaasCustomerId
    ? await deleteInAsaas(`/customers/${encodeURIComponent(asaasCustomerId)}`)
    : null

  return {
    cancelApi: cancelApiResult,
    asaas: {
      subscription: subscriptionDelete,
      customer: customerDelete,
    },
    context: {
      asaasId,
      asaasCustomerId,
    },
  }
}

export async function createProjectViaApi(page: Page, input: { name: string; slug: string }) {
  const response = await page.request.post('/api/v1/projects', {
    data: input,
  })
  const body = await response.json().catch(() => null)

  return { response, body }
}

export async function getSubscriptionViaApi(page: Page) {
  const response = await page.request.get('/api/v1/billing/subscription')
  const body = (await response.json().catch(() => null)) as BillingSubscriptionApiBody | null

  return { response, body }
}

export async function listProjectsViaApi(page: Page) {
  const response = await page.request.get('/api/v1/projects?page=1&pageSize=50')
  const body = await response.json().catch(() => null)

  return { response, body }
}
