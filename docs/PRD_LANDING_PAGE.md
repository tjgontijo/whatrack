# PRD: Whatrack Landing Page (LP)

## 1. Overview and Objective
The Landing Page (LP) serves as the primary marketing and conversion gateway for Whatrack. The objective of this project is to build a high-converting, visually stunning landing page that clearly communicates the value proposition of Whatrack's CRM, Meta Ads integration, WhatsApp automation, and data consolidation capabilities.

The design must enforce the premium SaaS aesthetics adopted by the dashboard (minimalist, card-based, robust typography, subtle micro-animations) while being heavily optimized for conversion rate (CRO) and SEO.

## 2. Key Target Audience
- Digital Marketing Agencies
- Info-product Launchers
- E-commerce operations heavily reliant on Meta Ads + WhatsApp CRMs
- High-ticket service providers needing granular tracking

## 3. Structural Wireframe

### 1. Hero Section
- **Headline:** A powerful, value-driven H1 directly addressing the pain point (e.g., "Pare de perder conversões. Rastreie e feche todas as suas vendas no WhatsApp num só lugar.").
- **Subheadline:** Quick supporting context mentioning the Meta Ads & WhatsApp synchronization.
- **CTA (Call to Action):** Primary button focusing on the "7-Day Free Trial" (e.g., "Comece seus 7 dias grátis").
- **Visual:** A highly polished mockup or stylized dashboard snapshot showcasing the premium UI.
- **Social Proof:** Logos of integrated tools (Meta, WhatsApp, Stripe, Hotmart).

### 2. Features / "How It Works" Showcase
A grid or stacked layout explaining the core propositions using animated cards or alternating image/text blocks:
- **Centralized CRM:** Managing leads without chaos.
- **Meta Ads Engine:** Bringing real CPA, ROI, and spend directly aligned with closed sales.
- **WhatsApp Inbox & Automation:** Seamless communication directly where the customer is.

### 3. Pricing Section (The Core Offer)
The pricing strategy focuses on simple, scalable tiers, emphasizing a risk-free entry point.
- **Prominent Hook:** 7 Dias de Teste Grátis em qualquer plano (7-Day Free Trial).
- **Format:** 3 distinct pricing cards side-by-side (or carousel on mobile).

#### The Tiers:
1. **Starter Plan** (e.g., "Básico / Starter")
   - *Price:* R$ 197 / mês
   - *Target:* Small operations starting out, limited users/leads.
   - *Features:* Access to basic CRM, 1 WhatsApp connection, limited Meta Ads spend tracking.

2. **Growth Plan (Highlighted / Most Popular)**
   - *Price:* R$ 297 - R$ 347/mês (TBD - Scaled relative to Starter)
   - *Target:* Growing agencies and launchers needing automation.
   - *Features:* More WhatsApp connections, full Meta Ads sync, larger lead capacity, advanced metrics.

3. **Pro/Scale Plan**
   - *Price:* Custom/Premium tier (e.g., R$ 497+ / mês)
   - *Target:* Large volume operations, multiple ad accounts, multiple team members.
   - *Features:* Unlimited potential constraints, priority support, full webhook, and pixel API sync.

### 4. Deep Dive / Use Cases
- A section targeting specific ICPs (Ideal Customer Profiles): "Para Agências", "Para Lançadores", "Para E-commerces".

### 5. Final CTA & Footer
- A secondary push for the 7-day trial.
- Standard legal links (Privacy, Terms), contact info (Email, Instagram), and a simplified sitemap.

## 4. Design Guidelines
- **Color Palette:** Strictly adhere to the primary and subtle muted tones of the application.
- **Typography:** Bold, clean sans-serif (e.g., Inter, Outfit) to convey modernity and truth.
- **Micro-interactions:** Use of Framer Motion (or equivalent) for scroll-reveals on features, hover elevations on pricing cards, and gradient tracking on buttons.
- **Performance:** Ensure Lighthouse score > 90. Pre-load critical assets. Use pure CSS or highly optimized components instead of heavy logic.

## 5. Execution Steps
1. Set up the `app/page.tsx` as a public route in Next.js.
2. Build reusable UI components for the landing (Navbar, Hero, GridFeatures, PricingCards, Footer).
3. Implement responsive styling, ensuring the mobile version is highly navigable and fast.
4. Integrate the "Start Trial" buttons directly into the Signup/Onboarding flow (e.g., `/auth/sign-up`).
5. Final QA for SEO tags, OpenGraph images, and accessibility.
