# PRD: Visual Identity Refit (Migration to Modern "Whatrack" Standard)

## 1. Overview and Objective
The objective of this refitting project is to align the older pages spanning the `src/app/dashboard` and `src/components/dashboard` paths with the newly established, premium visual guidelines observed in the latest feature implementations (like the "Meta Ads" data tables and configuration pages). 

The goal is to move away from overly generic "shell" layouts and generic data views and adopt bespoke, highly polished UI designs. This will enhance perceived value, improve user experience, and create a truly premium, unified SaaS look-and-feel.

## 2. Key UI/UX Principles
- **Modern Component Styling:** Migration from simple flat panels to rounded, elevated cards (`rounded-xl`, `shadow-sm`, `bg-white`).
- **Data Densification and Clarity:** Moving from generic list views to explicit, feature-rich implementations of `TanStack Table` with resizable columns, contextual actions, and visibility toggles tailored per page.
- **Top-Tier Toolbar Design:** Using grouped action bars with dynamic search, clear inline select components for filters (like dates, statuses, tags) side-by-side with clear action buttons (e.g., Refresh, Settings).
- **Responsive Granularity:** Proper stacking and drawer setups for mobile, ensuring that complex tables downgrade gracefully (like using the existing/updated `CrudCardView` concepts but heavily visually refined).
- **Loading & Empty States:** Implementation of aesthetic "skeleton" loaders and highly descriptive, visually appealing empty states (using faded icons and clear calls-to-action) rather than plain generic text.
- **Vibrant & Subtle Feedback:** Integrating subtle micro-animations (e.g., hover scaling, subtle color shifts on rows `hover:bg-muted/30`) and strict use of brand colors instead of default grays.

## 3. Scope of Migration (Phased Plan)

### Phase 1: Core System, Layout Foundation & Auth Pages
**Goal:** Adjust the structural foundation, overarching styles, and access points without breaking page functionalities.
- Ensure the main content layout (Sidebar, Header, Main Wrapper) has the correct background colors (`bg-muted/10` or `bg-[#f8f9fa]`) so that `bg-white` inner panels pop properly.
- Deprecate or refine generic layout components (like `CrudPageShell`) to support the new "Card-based" internal layout rather than full-width bleed styles.
- **Auth & Onboarding:** Redesign the login, signup, and onboarding flow to match the platform's high-end, premium "clean" aesthetics (e.g., split screens, blurred elements, large typography, micro-animations on input focuses).

### Phase 2: CRM & Core Entity Pages
**Goal:** Refit the heavy data pages that users interact with daily.
1. **Leads Page (`/dashboard/leads`):**
   - Replace generic CRUD views with a dedicated TanStack React Table component.
   - Refit the toolbar to match the Meta Ads style (Search, Date Select, and specific toggles).
   - Enhance the display of contact info, sales/metric tags using badges.
2. **Sales Page (`/dashboard/sales`):**
   - Introduce modern KPIs/Metric cards at the top before the table.
   - Upgrade the transaction rows to clearly distinguish status (Paid, Pending, Failed) using color-coded badges and icons.
3. **Products / Tickets (`/dashboard/products`, `/dashboard/tickets`):**
   - Redesign pipeline/board views if applicable to match modern Kanban Aesthetics (rounder corners, distinct column backgrounds, clean drag-state ghosting).

### Phase 3: Settings & Configuration Interfaces
**Goal:** Bring the configuration areas to the current premium standard.
1. **WhatsApp Settings (`/dashboard/settings/whatsapp`):**
   - Ensure the new structure designed recently is fully polished.
   - Standardize all configuration "sections" inside white, bordered, rounded-xl cards with explicit titles and descriptions matching the Meta Ads configuration area.
2. **Account & Organization Settings (`/dashboard/settings/profile`, `/dashboard/settings/organization`):**
   - Convert old vertical standard forms to horizontal segmented layouts (Title/Description on left, form inputs inside a card on the right).
3. **Pipeline & Meta Ads Settings (`/dashboard/settings/pipeline`, `/dashboard/settings/meta-ads`):**
   - Refine connection statuses, active/inactive toggles, and sync buttons.

### Phase 4: Refined Mobile Experience & Polish
**Goal:** Final sweeps specifically aimed at smaller breakpoints and interactive feedback.
- Ensure all large data tables transform into visually distinct, clean mobile cards.
- Add unified empty states across all modules.
- Ensure all dialogs and drawers follow the same styling (padding, overlay blur, action button positioning).

## 4. Execution Strategy
To accomplish this, we will work module by module to avoid breaking the application. For each target area:
1. Audit current specific functionality and data needs.
2. Rewrite the page's React structure mapping required filters/data to the new `Toolbar + Table Card` layout.
3. Replace generic `CrudPageShell` instances with bespoke page shells optimized for their specific domain.
4. Execute QA and review loading/error states.
