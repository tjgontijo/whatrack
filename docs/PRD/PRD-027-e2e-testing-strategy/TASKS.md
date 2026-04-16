# Tasks - Detailed Work Breakdown

**Data:** 2026-04-16  
**Status:** Ready for Implementation

---

## Phase 1: Foundation (Weeks 1-2)

### Week 1: Setup & Infrastructure

#### Task 1.1.1: Playwright Configuration
**Story:** As a developer, I can run E2E tests with Playwright

```
Description:
├─ Create playwright.config.ts
├─ Configure test directory (e2e/)
├─ Set baseURL to localhost:3000
├─ Configure reporter (HTML + JSON)
├─ Set timeout (30 seconds)
└─ Configure screenshot/video on failure

Files:
├─ playwright.config.ts (NEW)

Acceptance Criteria:
✅ npm run test:e2e command works
✅ Tests can run
✅ HTML report generates
✅ No config errors

Estimated: 2 hours
```

#### Task 1.1.2: SQLite Database Setup
**Story:** As a tester, I have a local SQLite database for tests

```
Description:
├─ Create .env.test with DATABASE_URL
├─ Create prisma/schema.test.prisma
├─ Supports all core entities (User, Org, Plan, etc)
├─ Can be reset before each test run
└─ Auto-seeds with test data

Files:
├─ .env.test (NEW)
├─ prisma/schema.test.prisma (NEW)
├─ .gitignore (MODIFY - add test.db)

Acceptance Criteria:
✅ test.db can be created
✅ Schema migrates successfully
✅ BD can be reset/recreated
✅ No Postgres dependency

Estimated: 3 hours
```

#### Task 1.1.3: Test Database Setup Script
**Story:** As a developer, the test DB is auto-created when tests run

```
Description:
├─ Create e2e/setup.ts
├─ Create e2e/global-setup.ts
├─ Generate Prisma client for test schema
├─ Create/migrate SQLite database
├─ Seed test data (users, orgs, plans)
└─ Cleanup on completion

Files:
├─ e2e/setup.ts (NEW)
├─ e2e/global-setup.ts (NEW)

Acceptance Criteria:
✅ BD created before tests
✅ Migrations applied
✅ Test data seeded
✅ BD reset between runs
✅ Cleanup works

Estimated: 3 hours
```

#### Task 1.1.4: Test Helpers - Authentication
**Story:** As a test author, I can easily login and manage sessions

```
Description:
├─ loginAsTestUser(page) - Sign in with test account
├─ logout(page) - Sign out
├─ waitForAuth(page) - Wait for auth completion
└─ Error handling for auth failures

Files:
├─ e2e/helpers/auth.ts (NEW)

Acceptance Criteria:
✅ Can login with test user
✅ Can logout
✅ Session persists across page reload
✅ Handles auth errors

Estimated: 2 hours
```

#### Task 1.1.5: Test Helpers - Sign-Up
**Story:** As a test author, I can easily create test accounts

```
Description:
├─ signUp(page, data) - Complete signup flow
├─ generateTestEmail() - Unique test email
├─ generateTestPassword() - Valid password
├─ waitForSignUpSuccess(page) - Wait for redirect
└─ verifyAccountCreated(page, email) - Verify creation

Files:
├─ e2e/helpers/signup.ts (NEW)

Acceptance Criteria:
✅ Can create account
✅ Auto-login after signup
✅ Emails are unique
✅ Passwords are strong

Estimated: 3 hours
```

#### Task 1.1.6: Test Helpers - Billing & Payment
**Story:** As a test author, I can test billing flows easily

```
Description:
├─ fillCardDetails(page, options) - Fill card form
├─ fillBillingInfo(page) - Fill billing address
├─ completeCheckout(page) - Submit payment
├─ waitForPaymentSuccess(page) - Wait for confirmation
├─ getProratingDetails(page) - Extract prorating data
├─ verifyProratingMath(page) - Validate calculations
├─ ASAAS_TEST_CARDS constant - Test card numbers

Files:
├─ e2e/helpers/billing.ts (NEW)

Acceptance Criteria:
✅ Can fill card details
✅ Can fill billing info
✅ Can process payment
✅ Can verify prorating
✅ Works with test cards

Estimated: 4 hours
```

**Week 1 Subtotal:** 17 hours

### Week 2: Test Implementation

#### Task 1.2.1: Sign-Up Tests (11 tests)
**Story:** As QA, sign-up flows are fully tested

```
Test Cases:
├─ Sign-up with valid data → account created ✅
├─ Invalid email rejected ✅
├─ Weak password rejected ✅
├─ Password mismatch rejected ✅
├─ Duplicate email prevented ✅
├─ Auto-login after signup ✅
├─ CPF required for BR users ✅
├─ CPF format validated ✅
├─ Server errors handled ✅
├─ Link to sign-in works ✅
└─ Password requirements shown ✅

File:
├─ e2e/auth-signup.spec.ts (NEW)

Acceptance Criteria:
✅ All 11 tests passing
✅ < 5 min execution
✅ < 2% flakiness
✅ Good error messages

Estimated: 4 hours
```

#### Task 1.2.2: Billing Auto-Upgrade Tests (6 tests)
**Story:** As QA, auto-upgrade is fully tested

```
Test Cases:
├─ Auto-upgrade Starter → Pro on 2nd project ✅
├─ Show invoice with prorating ✅
├─ Send email notification ✅
├─ Calculate credit correctly ✅
├─ Calculate charge correctly ✅
└─ Display prorating breakdown ✅

File:
├─ e2e/billing-auto-upgrade.spec.ts (NEW)

Acceptance Criteria:
✅ All 6 tests passing
✅ Prorating math correct
✅ Email sent
✅ < 5 min execution

Estimated: 4 hours
```

#### Task 1.2.3: Billing Advanced Tests (10 tests)
**Story:** As QA, advanced billing scenarios are tested

```
Test Cases:
├─ Auto-upgrade from Starter to Pro ✅
├─ Show correct prorating amounts ✅
├─ Send upgrade email ✅
├─ Process approved card (4111111111111111) ✅
├─ Decline invalid card (4000000000000002) ✅
├─ Require 3D Secure (4000002500000003) ✅
├─ Not upgrade when within limits ✅
├─ Calculate prorating for different days ✅
├─ Handle rapid project creation ✅
└─ Multiple rapid upgrades ✅

File:
├─ e2e/billing-auto-upgrade-advanced.spec.ts (NEW)

Acceptance Criteria:
✅ All 10 tests passing
✅ Payment processing works
✅ Asaas test cards work
✅ < 10 min execution

Estimated: 5 hours
```

#### Task 1.2.4: Full Journey Test
**Story:** As QA, end-to-end user journey is validated

```
Test Cases:
├─ Sign-up → Create projects → Auto-upgrade → Payment ✅
└─ Payment decline → Retry → Success ✅

File:
├─ e2e/full-flow.spec.ts (NEW)

Acceptance Criteria:
✅ Complete flow working
✅ All steps execute
✅ No breaks in chain
✅ Error handling works

Estimated: 3 hours
```

#### Task 1.2.5: CI/CD Integration
**Story:** As a developer, tests run in CI/CD automatically

```
Description:
├─ Update GitHub Actions to run E2E tests
├─ Upload HTML report as artifact
├─ Fail build if tests fail
├─ Artifact retention 30 days
└─ Status checks on PR

Files:
├─ .github/workflows/ (MODIFY)

Acceptance Criteria:
✅ Tests run in GitHub Actions
✅ Report generated
✅ PR status check works
✅ Artifact uploaded

Estimated: 2 hours
```

#### Task 1.2.6: Documentation
**Story:** As a developer, I know how to run and maintain tests

```
Description:
├─ README on how to run tests
├─ Troubleshooting guide
├─ How to write new tests
├─ Architecture overview
└─ Performance expectations

Files:
├─ Docs in e2e/README.md

Acceptance Criteria:
✅ Clear instructions
✅ Examples provided
✅ Troubleshooting complete
✅ Easy to follow

Estimated: 3 hours
```

**Week 2 Subtotal:** 21 hours

**Phase 1 Total:** 38 hours (1 person × 2 weeks)

---

## Phase 2: Core Features (Weeks 3-4)

### Task 2.1: Organizations & Teams (32 tests)

```
Components:
├─ Org Setup (8 tests)
├─ Member Management (10 tests)
├─ Roles & Permissions (8 tests)
└─ Org Settings (6 tests)

Files:
├─ e2e/billing/organizations.spec.ts
├─ e2e/billing/team-management.spec.ts
├─ e2e/billing/permissions.spec.ts
└─ e2e/billing/org-settings.spec.ts

Estimated: 16 hours (Week 3)
```

### Task 2.2: Projects & Workspace (12 tests)

```
Components:
├─ Project Management (8 tests)
└─ Project Limits & Upgrade (4 tests)

Files:
├─ e2e/projects/project-management.spec.ts
└─ e2e/projects/project-limits.spec.ts

Estimated: 8 hours (Week 3-4)
```

**Phase 2 Total:** 24 hours

---

## Phase 3: Integrations (Weeks 5-6)

### Task 3.1: WhatsApp Integration (30 tests)

```
Components:
├─ Business Account Connection (10 tests)
├─ Campaigns (12 tests)
└─ Conversations (8 tests)

Files:
├─ e2e/integrations/whatsapp-auth.spec.ts
├─ e2e/integrations/whatsapp-campaigns.spec.ts
└─ e2e/integrations/whatsapp-conversations.spec.ts

Estimated: 18 hours (Week 5)
```

### Task 3.2: Meta Ads Integration (24 tests)

```
Components:
├─ Business Connection (8 tests)
├─ Campaign Management (10 tests)
└─ Conversion Tracking (6 tests)

Files:
├─ e2e/integrations/meta-auth.spec.ts
├─ e2e/integrations/meta-campaigns.spec.ts
└─ e2e/integrations/meta-conversions.spec.ts

Estimated: 15 hours (Week 5-6)
```

**Phase 3 Total:** 33 hours

---

## Phase 4: Polish (Week 7)

### Task 4.1: Error Handling (18 tests)

```
Components:
├─ HTTP Errors (8 tests)
├─ Form Validation (6 tests)
└─ Offline Support (4 tests)

Files:
├─ e2e/error-handling/http-errors.spec.ts
├─ e2e/error-handling/form-validation.spec.ts
└─ e2e/error-handling/offline.spec.ts

Estimated: 10 hours
```

### Task 4.2: Performance & Compliance (8 tests)

```
Components:
├─ Performance (4 tests)
└─ GDPR Compliance (4 tests)

Files:
├─ e2e/performance/page-load.spec.ts
└─ e2e/compliance/gdpr.spec.ts

Estimated: 6 hours
```

### Task 4.3: Final Documentation

```
├─ Full test documentation
├─ Architecture guide
├─ Maintenance guide
└─ Lessons learned

Estimated: 4 hours
```

**Phase 4 Total:** 20 hours

---

## Summary by Week

| Week | Tasks | Hours | Person-Days |
|------|-------|-------|-------------|
| 1 | Setup (1.1.1-1.1.6) | 17 | 2.1 |
| 2 | Tests (1.2.1-1.2.6) | 21 | 2.6 |
| 3 | Phase 2 Part 1 | 16 | 2.0 |
| 4 | Phase 2 Part 2 | 8 | 1.0 |
| 5 | Phase 3 Part 1 | 18 | 2.25 |
| 6 | Phase 3 Part 2 | 15 | 1.88 |
| 7 | Phase 4 | 20 | 2.5 |
| **Total** | **All** | **115** | **14.38** |

---

## Resource Allocation

### Option A: 1 Full-Time Developer
```
Timeline: 7 weeks (continuous)
├─ Weeks 1-2: Phase 1 (38h)
├─ Weeks 3-4: Phase 2 (24h)
├─ Weeks 5-6: Phase 3 (33h)
└─ Week 7: Phase 4 (20h)

Total: 115 hours ÷ 40h/week = ~2.9 weeks actual work
But: 7 weeks calendar (includes review, iteration)
```

### Option B: 2 Developers (50% each)
```
Timeline: 7 weeks (parallel)
├─ Weeks 1-2: Dev A (Phase 1), Dev B (setup)
├─ Weeks 3-4: Dev A (Phase 2), Dev B (Phase 2)
├─ Weeks 5-6: Dev A (Phase 3), Dev B (Phase 3)
└─ Week 7: Both (Phase 4)
```

### Recommended: Option A (1 full-time)
```
Pros:
├─ Single point of knowledge
├─ Consistent architecture
├─ Easier code review
└─ Clear ownership

Timeline:
├─ Weeks 1-2: 100% effort (setup + tests)
├─ Weeks 3-4: 50% effort (Phase 2 while doing other work)
├─ Weeks 5-7: 50% effort (Phase 3-4 while doing other work)
```

---

## Dependencies

### Hard Blockers ❌
None - can start immediately

### Soft Dependencies ⚠️
```
Asaas:
├─ Test API key (have it)
├─ Test environment (configured)
└─ Test cards (ready)

Meta/WhatsApp:
├─ Needed only for Phase 3
├─ Can mock for Phase 1-2
└─ Ready in Phase 3
```

---

## Risks & Mitigations

### Risk 1: Setup Complexity
**Mitigation:** Clear docs + helpers abstract complexity

### Risk 2: Flaky Tests
**Mitigation:** SQLite is deterministic, good waits, isolation

### Risk 3: Slow Execution
**Mitigation:** SQLite is fast, target < 40 min for 147 tests

### Risk 4: Team Adoption
**Mitigation:** Clear benefits, examples, documentation

---

## Success Criteria Checklist

### Phase 1 (Week 2)
```
□ 33 tests passing
□ < 10 min execution
□ < 2% flakiness
□ CI/CD integrated
□ Team understands approach
□ Documentation complete
```

### Phase 2 (Week 4)
```
□ 77 tests passing (33+44)
□ < 15 min execution
□ < 2% flakiness
□ Org/team features tested
□ Project limits validated
```

### Phase 3 (Week 6)
```
□ 131 tests passing (77+54)
□ < 25 min execution
□ < 2% flakiness
□ WhatsApp workflows tested
□ Meta Ads workflows tested
```

### Phase 4 (Week 7)
```
□ 147 tests passing
□ < 40 min execution
□ < 2% flakiness
□ All edge cases covered
□ Full documentation
□ Maintenance guide done
```

---

## Document History

| Versão | Data | Mudanças |
|--------|------|----------|
| 1.0 | 2026-04-16 | Tasks inicial |
