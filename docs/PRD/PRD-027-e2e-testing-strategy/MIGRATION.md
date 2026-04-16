# Migration - Implementation Guide

**Data:** 2026-04-16

---

## Implementation Overview

This document guides implementation of PRD-027: E2E Testing Strategy.

---

## Phase 1: Foundation (Weeks 1-2)

### Week 1: Setup & Core Tests

#### Day 1: Playwright Setup
```bash
# ✅ Already done
npm install -D @playwright/test

# Create config
touch playwright.config.ts

# Create test directory
mkdir -p e2e/helpers
```

#### Days 2-3: Database Setup
```
✅ Create .env.test with test database URL
✅ Create prisma/schema.test.prisma
✅ Create e2e/setup.ts for initialization
✅ Create e2e/global-setup.ts for Playwright hook
```

**Deliverables:**
- ✅ `.env.test` configured
- ✅ SQLite schema ready
- ✅ BD can be created/reset
- ✅ Data seeding works

#### Days 4-5: Test Helpers
```
✅ e2e/helpers/auth.ts
   ├─ loginAsTestUser()
   ├─ logout()
   └─ waitForAuth()

✅ e2e/helpers/signup.ts
   ├─ signUp()
   ├─ generateTestEmail()
   ├─ generateTestPassword()
   └─ waitForSignUpSuccess()

✅ e2e/helpers/billing.ts
   ├─ fillCardDetails()
   ├─ fillBillingInfo()
   ├─ completeCheckout()
   ├─ waitForPaymentSuccess()
   ├─ getProratingDetails()
   └─ verifyProratingMath()
```

**Deliverables:**
- ✅ Helpers written
- ✅ Tests using helpers
- ✅ Code reusable across tests

### Week 2: Core Tests Implementation

#### Days 1-2: Auth & Sign-Up Tests (11 tests)
```
✅ e2e/auth-signup.spec.ts
   ├─ Create account
   ├─ Invalid email validation
   ├─ Password strength validation
   ├─ Duplicate email prevention
   ├─ Auto-login after signup
   ├─ Initialize organization
   ├─ Require CPF for BR users
   ├─ CPF format validation
   ├─ Server error handling
   ├─ Link to sign-in page
   └─ Show password requirements
```

**Success Criteria:**
- ✅ All 11 tests passing
- ✅ < 2% flakiness
- ✅ < 5 min execution
- ✅ SQLite BD working

#### Days 3-4: Billing Auto-Upgrade Tests (16 tests)
```
✅ e2e/billing-auto-upgrade.spec.ts (6 tests)
   ├─ Auto-upgrade Starter → Pro
   ├─ Show invoice with prorating
   ├─ Send email notification
   ├─ Calculate prorating correctly
   ├─ Display prorating math
   └─ Link to sign-in

✅ e2e/billing-auto-upgrade-advanced.spec.ts (10 tests)
   ├─ Auto-upgrade from Starter to Pro
   ├─ Show prorating amounts
   ├─ Process payment (approved card)
   ├─ Handle declined card
   ├─ Trigger 3D Secure
   ├─ Send upgrade email
   ├─ Not upgrade within limits
   ├─ Calculate prorating correctly
   ├─ Handle rapid project creation
   └─ Multiple rapid creations
```

**Success Criteria:**
- ✅ All 16 tests passing
- ✅ Prorating math validated
- ✅ Email notification sent
- ✅ < 2% flakiness

#### Day 5: Full Journey Test
```
→ e2e/full-flow.spec.ts (2+ tests)
   ├─ Sign-up → Projects → Auto-upgrade → Payment
   └─ Payment decline → Retry → Success

Base ready, can be enhanced
```

### Week 1-2 Deliverables
```
✅ Playwright configured
✅ SQLite database working
✅ Test helpers (auth, signup, billing)
✅ 33 tests implemented
✅ All tests passing
✅ CI/CD integration ready
✅ HTML reports generated
✅ < 10 min execution time
✅ < 2% flakiness
```

### Week 1-2 Success Criteria
- ✅ 33 tests passing
- ✅ No flaky tests
- ✅ BD resets correctly
- ✅ Helpers work reliably
- ✅ Reports generated
- ✅ CI/CD integrated

---

## Phase 2: Core Features (Weeks 3-4)

### Week 3: Organizations & Teams (32 tests)

```
📋 Org Setup (8 tests)
├─ Create org on signup
├─ Auto-generate slug
├─ Update org name
├─ Upload logo
├─ Set timezone
├─ View org details
├─ Update description
└─ Archive organization

👥 Member Management (10 tests)
├─ Invite team member
├─ Accept invitation
├─ Assign roles (admin/member/viewer)
├─ Update member role
├─ Remove member
├─ View team members
├─ View member activity
├─ Cancel invitation
├─ Bulk invite
└─ Resend invitation

🔐 Roles & Permissions (8 tests)
├─ Admin can manage all
├─ Member can create projects
├─ Viewer read-only
├─ Restrict billing to admin
├─ Enforce API permissions
├─ Show/hide by role
├─ Audit permission actions
└─ Test conflicts

⚙️ Org Settings (6 tests)
├─ Change org name
├─ Update contact email
├─ Set payment contact
├─ Enable/disable features
├─ Set preferences
└─ Configure integrations
```

**Implementation Approach:**
```
1. Create org fixtures
2. Create member fixtures
3. Test org workflows
4. Test permission enforcement
5. Test admin workflows
```

### Week 4: Projects & Workspace (12 tests)

```
📁 Project Management (8 tests)
├─ Create project
├─ List projects (paginated)
├─ Search/filter projects
├─ Update project info
├─ Archive project
├─ Delete archived
├─ Restore project
└─ Set as default

📊 Project Limits (4 tests)
├─ Show project count in plan
├─ Prevent creation beyond limit
├─ Show upgrade prompt
└─ Calculate prorating correctly
```

### Week 3-4 Deliverables
```
→ 44 new tests implemented
→ 77 total tests passing
→ Org/team workflows validated
→ Project management tested
→ Permission model verified
```

---

## Phase 3: Integrations (Weeks 5-6)

### Week 5: WhatsApp Integration (30 tests)

```
📱 Business Account (10 tests)
├─ Authorize with Meta
├─ Select WABA
├─ Select phone number
├─ Verify phone (OTP)
├─ Store token securely
├─ Disconnect
├─ Re-authorize
├─ Handle auth errors
├─ Display status
└─ Show details

📢 Campaigns (12 tests)
├─ Create campaign
├─ Select template
├─ Upload recipients (CSV)
├─ Preview message
├─ Schedule campaign
├─ Launch immediately
├─ Monitor progress
├─ Cancel campaign
├─ View results
├─ Export report
├─ Retry failures
└─ Handle errors

💬 Conversations (8 tests)
├─ View conversations
├─ Open conversation
├─ Send message
├─ Send media
├─ Tag conversation
├─ Archive
├─ Search
└─ View history
```

### Week 6: Meta Ads Integration (24 tests)

```
🔗 Business Connection (8 tests)
├─ Authorize with Meta
├─ Select business account
├─ Select ad account
├─ Verify permissions
├─ Disconnect
├─ Handle errors
├─ Refresh token
└─ Display status

📊 Campaign Management (10 tests)
├─ Create campaign
├─ Set budget
├─ Select audience
├─ Create creative
├─ Review before launch
├─ Launch
├─ Pause
├─ Resume
├─ Delete
└─ Monitor metrics

📈 Conversion Tracking (6 tests)
├─ Install pixel
├─ Track conversions
├─ View data
├─ Test installation
├─ Export report
└─ Reconcile data
```

### Week 5-6 Deliverables
```
→ 54 new tests implemented
→ 131 total tests passing
→ WhatsApp workflows tested
→ Meta Ads workflows tested
→ Integration points validated
```

---

## Phase 4: Polish (Week 7)

### Error Handling (18 tests)

```
❌ HTTP Errors (8 tests)
├─ Handle 404
├─ Handle 403
├─ Handle 500
├─ Handle 503
├─ Network timeout
├─ Network disconnect
├─ Retry logic
└─ Error messages

✔️ Form Validation (6 tests)
├─ Required fields
├─ Email format
├─ Phone format
├─ CPF format
├─ Clear on correction
└─ Inline validation

📱 Offline Support (4 tests)
├─ Offline indicator
├─ Queue actions
├─ Sync on reconnect
└─ Handle conflicts
```

### Performance & Compliance (8 tests)

```
⚡ Performance (4 tests)
├─ Dashboard < 2s
├─ Projects < 1s
├─ Checkout < 3s
└─ No layout shift

✅ GDPR Compliance (4 tests)
├─ Right to be forgotten
├─ Data portability
├─ Privacy policy
└─ Consent management
```

### Week 7 Deliverables
```
✅ 26 new tests implemented
✅ 147 total tests passing (100%)
✅ All edge cases covered
✅ Performance validated
✅ Compliance verified
✅ Full documentation
```

---

## Implementation Checklist

### Before Starting
```
□ Read CONTEXT.md
□ Read DIAGNOSTIC.md
□ Create PRD-027 directory
□ Add dev dependencies
□ Brief team on approach
```

### Phase 1 Week 1
```
□ Playwright configuration done
□ .env.test created
□ Schema for SQLite ready
□ Setup scripts working
□ Test database resets correctly
```

### Phase 1 Week 2
```
□ Auth/signup helpers done
□ Billing helpers done
□ 11 auth/signup tests passing
□ 16 billing tests passing
□ Full flow test framework ready
□ CI/CD integration tested
□ < 10 min execution
□ < 2% flakiness
```

### Phase 2
```
□ Org/team tests (32)
□ Project tests (12)
□ All 44 tests passing
□ Total: 77 tests passing
□ < 15 min execution
```

### Phase 3
```
□ WhatsApp tests (30)
□ Meta Ads tests (24)
□ All 54 tests passing
□ Total: 131 tests passing
□ < 25 min execution
```

### Phase 4
```
□ Error handling tests (18)
□ Performance tests (4)
□ Compliance tests (4)
□ Offline tests (4)
□ All 26 tests passing
□ Total: 147 tests passing
□ < 40 min execution
□ Full documentation
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Database Not Resetting
**Symptom:** Tests fail randomly
**Solution:**
```bash
# Verify reset script runs before tests
npm run test:e2e

# Manually reset if needed
rm -f test.db
```

### Pitfall 2: Slow Tests
**Symptom:** Suite takes > 40 min
**Solution:**
```
• Don't wait for animations (add data-testid)
• Reduce browser waits
• Use fixtures for setup
• Parallel execution (Phase 2+)
```

### Pitfall 3: Flaky Tests
**Symptom:** Tests pass locally, fail in CI
**Solution:**
```
• Add explicit waits (waitForURL, waitForElement)
• Don't rely on timing
• Reset DB between tests
• Use deterministic test data
```

### Pitfall 4: Hard to Debug
**Symptom:** Test fails, can't see why
**Solution:**
```bash
# Use debug mode
npm run test:e2e:debug

# Run with headed browser
npx playwright test --headed

# Check screenshots in test-results/
```

---

## Rollback Plan

If Phase fails:

### Phase 1 Issues
```
→ Delete e2e/
→ Remove @playwright/test
→ Revert playwright.config.ts
→ Keep unit tests (still valuable)
→ Document lessons learned
```

### Phase 2+ Issues
```
→ Don't delete Phase 1 tests
→ Skip failing Phase N tests
→ Continue with Phase N+1
→ Document blockers
→ Plan fix for next iteration
```

---

## Success Metrics per Phase

### Phase 1: Foundation
```
✅ 33 tests passing
✅ < 10 min execution
✅ < 2% flakiness
✅ SQLite working
✅ CI/CD integrated
```

### Phase 2: Core Features
```
✅ 77 tests total passing
✅ < 15 min execution
✅ < 2% flakiness
✅ Org/team workflows tested
✅ Project management tested
```

### Phase 3: Integrations
```
✅ 131 tests total passing
✅ < 25 min execution
✅ < 2% flakiness
✅ WhatsApp tested
✅ Meta Ads tested
```

### Phase 4: Polish
```
✅ 147 tests total passing
✅ < 40 min execution
✅ < 2% flakiness
✅ All edge cases covered
✅ Full documentation
```

---

## Next Steps

1. ✅ Create PRD-027 documentation
2. → Assign Phase 1 implementation
3. → Set up weekly sync
4. → Daily stand-up during Phase 1
5. → Review Phase 1 at end of Week 2
6. → Plan Phase 2

---

## Document History

| Versão | Data | Mudanças |
|--------|------|----------|
| 1.0 | 2026-04-16 | Guia inicial |
