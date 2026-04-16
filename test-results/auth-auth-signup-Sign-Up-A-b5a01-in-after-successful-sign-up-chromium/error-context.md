# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth/auth-signup.spec.ts >> Sign Up & Account Creation >> should auto-login after successful sign up
- Location: e2e/auth/auth-signup.spec.ts:94:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="fullName"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - img "Whatrack" [ref=e8]
        - generic: Para agências e gestores de tráfego
        - heading "Prove para cada cliente o que realmente vende no WhatsApp." [level=1] [ref=e9]
        - paragraph [ref=e10]: Conecte Meta Ads e WhatsApp, rastreie conversões reais e entregue relatórios de ROI que ajudam sua agência a reter clientes e justificar budget.
      - generic [ref=e17]:
        - generic [ref=e18]: Múltiplos clientes no mesmo painel
        - generic [ref=e19]: trial sem cartão e setup em poucos minutos.
      - generic:
        - img
    - generic [ref=e22]:
      - heading "Crie sua conta para continuar" [level=1] [ref=e24]
      - generic [ref=e25]:
        - group [ref=e26]:
          - generic [ref=e27]: Nome completo
          - textbox "Nome completo" [ref=e28]:
            - /placeholder: Seu nome
        - group [ref=e29]:
          - generic [ref=e30]: Email
          - textbox "Email" [ref=e31]:
            - /placeholder: seu@email.com
        - group [ref=e32]:
          - generic [ref=e33]: Documento fiscal
          - generic [ref=e34]:
            - button "CPF" [ref=e35] [cursor=pointer]
            - button "CNPJ" [ref=e36] [cursor=pointer]
        - group [ref=e37]:
          - generic [ref=e38]: Senha
          - group [ref=e39]:
            - textbox "Senha" [ref=e40]:
              - /placeholder: Mín. 8 caracteres
            - group [ref=e41]:
              - button "Mostrar senha" [ref=e42] [cursor=pointer]:
                - img
        - group [ref=e43]:
          - generic [ref=e44]: Confirmar senha
          - group [ref=e45]:
            - textbox "Confirmar senha" [ref=e46]:
              - /placeholder: Repita a senha
            - group [ref=e47]:
              - button "Mostrar confirmação de senha" [ref=e48] [cursor=pointer]:
                - img
        - button "Continuar para pagamento" [ref=e49] [cursor=pointer]
      - generic [ref=e50]:
        - text: Já tem uma conta?
        - link "Entrar na plataforma" [ref=e51] [cursor=pointer]:
          - /url: /sign-in
    - region "Notifications alt+T"
  - generic [ref=e52]:
    - img [ref=e54]
    - button "Open Tanstack query devtools" [ref=e102] [cursor=pointer]:
      - img [ref=e103]
  - button "Open Next.js Dev Tools" [ref=e156] [cursor=pointer]:
    - img [ref=e157]
  - alert [ref=e160]
```

# Test source

```ts
  1  | import { Page } from '@playwright/test'
  2  | 
  3  | export interface SignUpData {
  4  |   name: string
  5  |   email: string
  6  |   password: string
  7  |   documentType?: 'CPF' | 'CNPJ'
  8  |   documentNumber?: string
  9  | }
  10 | 
  11 | export function generateTestEmail(): string {
  12 |   return `test-${Date.now()}@example.com`
  13 | }
  14 | 
  15 | export function generateTestPassword(): string {
  16 |   return `Test${Date.now()}!@#`
  17 | }
  18 | 
  19 | export async function signUp(page: Page, data: SignUpData) {
  20 |   await page.goto('/sign-up')
  21 | 
> 22 |   // Fill form
     |              ^ Error: page.fill: Test timeout of 30000ms exceeded.
  23 |   await page.fill('input[name="name"]', data.name)
  24 |   await page.fill('input[name="email"]', data.email)
  25 | 
  26 |   // Select document type if provided
  27 |   if (data.documentType) {
  28 |     const docTypeButton = page.locator(`button:has-text("${data.documentType}")`).first()
  29 |     await docTypeButton.click()
  30 | 
  31 |     // Fill document number
  32 |     if (data.documentNumber) {
  33 |       await page.fill('input[name="documentNumber"]', data.documentNumber)
  34 |     }
  35 |   }
  36 | 
  37 |   // Fill password
  38 |   await page.fill('input[name="password"]', data.password)
  39 |   await page.fill('input[name="confirmPassword"]', data.password)
  40 | 
  41 |   // Submit form
  42 |   const submitButton = page.locator('button[type="submit"]')
  43 |   await submitButton.click()
  44 | }
  45 | 
  46 | export async function waitForSignUpSuccess(page: Page, timeout = 10000) {
  47 |   // Wait for redirect to dashboard, welcome, or checkout
  48 |   await page.waitForURL('**/dashboard/**|**/welcome**|**/checkout**|**/verify-email/**', { timeout })
  49 | }
  50 | 
  51 | export async function verifyAccountCreated(page: Page, email: string) {
  52 |   // Check if we can find the user email in the page
  53 |   const userEmail = page.locator(`text=${email}`)
  54 |   return userEmail.isVisible().catch(() => false)
  55 | }
  56 | 
```