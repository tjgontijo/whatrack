# E2E Tests - Organized by Domain

**Structure:** Tests organized by business domain for clarity and maintainability.

---

## Directory Structure

```
e2e/
├── auth/                          # Authentication tests
│   └── auth-signup.spec.ts       # Sign-up, login, session
│
├── billing/                       # Billing & subscription tests
│   ├── billing-auto-upgrade.spec.ts
│   ├── billing-auto-upgrade-advanced.spec.ts
│   └── full-flow.spec.ts         # End-to-end flows
│
├── projects/                      # Project management tests
│   └── [Phase 2+]
│
├── organizations/                 # Org & team tests
│   └── [Phase 2+]
│
├── integrations/                  # External API integrations
│   ├── whatsapp/                 # WhatsApp business integration
│   │   └── [Phase 3+]
│   └── meta/                     # Meta Ads integration
│       └── [Phase 3+]
│
├── notifications/                 # Email & in-app notifications
│   └── [Phase 1+]
│
├── error-handling/                # Error scenarios & edge cases
│   └── [Phase 4+]
│
├── performance/                   # Performance & optimization
│   └── [Phase 4+]
│
├── shared/                        # Reusable helpers & utilities
│   ├── auth.ts                   # Login, logout, auth helpers
│   ├── signup.ts                 # Account creation helpers
│   └── billing.ts                # Payment & billing helpers
│
├── fixtures.ts                    # Test fixtures (auth, org, data)
├── setup.ts                       # Database setup & seeding
├── global-setup.ts                # Playwright global setup
└── README.md                      # This file
```

---

## Phases & Coverage

### Phase 1: Foundation ✅
```
auth/
├─ auth-signup.spec.ts (11 tests)

billing/
├─ billing-auto-upgrade.spec.ts (6 tests)
├─ billing-auto-upgrade-advanced.spec.ts (10 tests)
└─ full-flow.spec.ts (2 tests)

Total: 33 tests
```

### Phase 2: Core Features (→ Weeks 3-4)
```
projects/
└─ project-management.spec.ts (12 tests)

organizations/
├─ org-setup.spec.ts (8 tests)
├─ team-management.spec.ts (10 tests)
├─ permissions.spec.ts (8 tests)
└─ org-settings.spec.ts (6 tests)

Total: 44 tests
```

### Phase 3: Integrations (→ Weeks 5-6)
```
integrations/whatsapp/
├─ business-connection.spec.ts (10 tests)
├─ campaigns.spec.ts (12 tests)
└─ conversations.spec.ts (8 tests)

integrations/meta/
├─ business-connection.spec.ts (8 tests)
├─ campaigns.spec.ts (10 tests)
└─ conversions.spec.ts (6 tests)

Total: 54 tests
```

### Phase 4: Polish (→ Week 7)
```
error-handling/
├─ http-errors.spec.ts (8 tests)
├─ form-validation.spec.ts (6 tests)
└─ offline.spec.ts (4 tests)

notifications/
├─ email-notifications.spec.ts (6 tests)
└─ in-app-notifications.spec.ts (4 tests)

performance/
└─ page-load.spec.ts (4 tests)

Total: 26 tests
```

---

## Quick Start

### Run All Tests
```bash
npm run test:e2e
```

### Run Tests by Domain
```bash
# Auth tests only
npx playwright test e2e/auth/

# Billing tests only
npx playwright test e2e/billing/

# WhatsApp integration only
npx playwright test e2e/integrations/whatsapp/
```

### Run Specific Test
```bash
npx playwright test -g "auto-upgrade"
npx playwright test -g "sign-up"
```

### Debug Tests
```bash
# Visual debugging
npm run test:e2e:ui

# Step-by-step debugging
npm run test:e2e:debug
```

---

## Using Helpers

### Auth Helper
```typescript
import { loginAsTestUser, logout } from '../shared/auth'

test('user can logout', async ({ page }) => {
  await loginAsTestUser(page)
  await logout(page)
  await expect(page).toHaveURL('/sign-in')
})
```

### Sign-Up Helper
```typescript
import { signUp, generateTestEmail } from '../shared/signup'

test('create account', async ({ page }) => {
  const email = generateTestEmail()
  await signUp(page, {
    fullName: 'Test User',
    email,
    password: 'TestPassword123!@#',
    cpf: '12345678901',
  })
})
```

### Billing Helper
```typescript
import {
  fillCardDetails,
  ASAAS_TEST_CARDS,
  completeCheckout,
  waitForPaymentSuccess,
} from '../shared/billing'

test('process payment', async ({ page }) => {
  await fillCardDetails(page, {
    number: ASAAS_TEST_CARDS.APPROVED,
  })
  await completeCheckout(page)
  await waitForPaymentSuccess(page)
})
```

---

## Writing New Tests

### Test Template
```typescript
import { test, expect } from '@playwright/test'
import { loginAsTestUser } from '../shared/auth'

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Arrange
    await loginAsTestUser(page)
    
    // Act
    await page.goto('/dashboard')
    await page.click('button:has-text("Create")')
    
    // Assert
    await expect(page.locator('[data-testid="success"]')).toBeVisible()
  })
})
```

### Naming Conventions
```
✅ Good:
- e2e/auth/auth-signup.spec.ts
- e2e/billing/billing-auto-upgrade.spec.ts
- e2e/integrations/whatsapp/whatsapp-campaigns.spec.ts

❌ Bad:
- e2e/test1.spec.ts
- e2e/tests.spec.ts
- e2e/new-feature.spec.ts
```

### File Organization
```
Each domain has its own folder:
├─ One spec file per major feature
├─ Shared helpers in shared/
├─ Test data in setup.ts
└─ Fixtures in fixtures.ts
```

---

## Data & Fixtures

### Test Users
```typescript
// Generated per test run
{
  email: "test-{timestamp}@example.com"
  password: "Test{timestamp}!@#"
  fullName: "Test User"
  cpf: "12345678901"
}
```

### Test Cards (Asaas)
```
✅ 4111111111111111 - Always approved
❌ 4000000000000002 - Always declined
✅ 4000002500000003 - Requires 3D Secure
```

### Environment Variables
```
DATABASE_URL=file:./test.db
NEXTAUTH_SECRET=test-secret-key
ASAAS_API_KEY=test_key
```

---

## Best Practices

### DO ✅
- Use data-testid attributes for reliable selectors
- Import helpers from shared/
- Use descriptive test names
- Keep tests independent
- Reset DB between runs
- Handle async operations properly

### DON'T ❌
- Hardcode test data
- Use element indices (fragile)
- Test implementation details
- Skip async waits
- Share state between tests
- Ignore error messages

---

## Troubleshooting

### Tests Failing Locally?
```bash
# Clean and reset database
rm -f test.db

# Reinstall dependencies
npm install

# Run again
npm run test:e2e
```

### Slow Tests?
```bash
# Check for unnecessary waits
npm run test:e2e:debug

# Profile with headed mode
npx playwright test --headed
```

### Flaky Tests?
```bash
# Add explicit waits
await page.waitForURL('/expected-url')
await expect(page.locator('[data-testid="element"]')).toBeVisible()

# Avoid timing-based assertions
// ❌ Bad
await page.waitForTimeout(1000)

// ✅ Good
await page.waitForURL('/dashboard')
```

---

## CI/CD Integration

Tests run automatically on:
- ✅ Every PR (GitHub Actions)
- ✅ Every push to main
- ✅ Before merge

Reports:
- 📊 HTML report (artifacts)
- 📝 JSON results
- 🔴 CI status check

---

## Phase Implementation Timeline

```
Week 1-2:  Phase 1 (auth + billing) ✅ DONE
Week 3-4:  Phase 2 (projects + orgs) → Starting
Week 5-6:  Phase 3 (integrations) → Future
Week 7:    Phase 4 (polish) → Future
```

---

## Reference Documentation

- [Playwright Docs](https://playwright.dev)
- [PRD-027](../../docs/PRD/PRD-027-e2e-testing-strategy/README.md)
- [Test Specification](../../docs/PRD/PRD-027-e2e-testing-strategy/MIGRATION.md)
- [Task Breakdown](../../docs/PRD/PRD-027-e2e-testing-strategy/TASKS.md)

---

## Contributing

### Adding New Domain Tests
1. Create folder: `e2e/{domain}/`
2. Create test files: `e2e/{domain}/{feature}.spec.ts`
3. Use shared helpers from `e2e/shared/`
4. Document in this README
5. Update phase coverage

### Updating Helpers
1. Edit `e2e/shared/{domain}.ts`
2. Export new functions
3. Update imports in tests
4. Document usage

---

## Last Updated

**Date:** 2026-04-16  
**Status:** Phase 1 implementation in progress
