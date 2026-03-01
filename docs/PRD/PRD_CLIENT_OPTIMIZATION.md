# PRD: Otimizacao Definitiva do Client-Side

## Objetivo

Eliminar todas as violacoes de pattern do client-side React/Next.js que geram network chatter, re-renders desnecessarios, polling ineficiente e uso indevido de `useEffect`. Apos esta entrega, o codebase deve ter **zero violacoes** dos guardrails definidos.

## Contexto

Apos 5 commits de otimizacao (`3192456`..`6b2cc6d`), uma auditoria completa revelou **89+ oportunidades de melhoria** restantes. Este PRD organiza a execucao em fases priorizadas por impacto.

---

## Fase 1: Remover `cache: 'no-store'` de Fetches Client-Side

**Impacto**: Alto — anula staleTime do TanStack Query e impede request deduplication do navegador.

### Arquivos

| Arquivo | Linhas | Acao |
|---------|--------|------|
| `src/hooks/audit/use-audit-logs.ts` | 77, 101 | Remover `cache: 'no-store'` das 2 chamadas fetch |
| `src/hooks/ui/use-crud-infinite-query.ts` | 62 | Remover `cache: 'no-store'` |
| `src/hooks/auth/use-authorization.ts` | 24 | Remover `cache: 'no-store'` |
| `src/hooks/organization/use-organization-completion.ts` | 22 | Remover `cache: 'no-store'` |
| `src/app/(auth)/accept-invitation/[invitationId]/page.tsx` | 92 | Remover `cache: 'no-store'` |

### Regra

`cache: 'no-store'` so e valido em Server Components (fetch do Next.js). Em client components com TanStack Query, a freshness e controlada por `staleTime` e `gcTime`. Usar `cache: 'no-store'` em client fetch desativa o cache HTTP do browser sem beneficio, pois o TanStack Query ja gerencia o ciclo de vida dos dados.

---

## Fase 2: Substituir Polling por setInterval

**Impacto**: Alto — polling a 500ms consome CPU e rede continuamente.

### 2A: Popup Polling (WhatsApp e Meta Ads Onboarding)

| Arquivo | Linhas | Problema |
|---------|--------|----------|
| `src/hooks/whatsapp/use-whatsapp-onboarding.ts` | 120-131 | `setInterval(500ms)` verificando `popup.closed` |
| `src/hooks/meta-ads/use-meta-ads-onboarding.ts` | 58-68 | `setInterval(500ms)` verificando `popup.closed` |

**Solucao**: Substituir `setInterval` por `window.addEventListener('focus', ...)`. Quando o popup fecha, a janela pai recebe foco. Verificar `popup.closed` apenas no callback de focus. Fallback com `visibilitychange` para edge cases.

```typescript
// ANTES (errado)
const interval = setInterval(() => {
  if (popup.closed) { clearInterval(interval); onComplete() }
}, 500)

// DEPOIS (correto)
const onFocus = () => {
  if (popupRef.current?.closed) {
    window.removeEventListener('focus', onFocus)
    onComplete()
  }
}
window.addEventListener('focus', onFocus)
```

### 2B: Debounce via setTimeout

| Arquivo | Linhas | Problema |
|---------|--------|----------|
| `src/components/dashboard/items/items-table.tsx` | 110 | `setTimeout(400ms)` para debounce search |
| `src/app/dashboard/tickets/page.tsx` | 264 | `setTimeout(400ms)` para debounce search |
| `src/components/dashboard/leads/client-leads-table.tsx` | 124 | `setTimeout(400ms)` para debounce search |
| `src/components/dashboard/item-categories/categories-table.tsx` | 126 | `setTimeout(400ms)` para debounce search |
| `src/components/dashboard/sales/client-sales-table.tsx` | 140 | `setTimeout(400ms)` para debounce search |

**Solucao**: Extrair utilitario `useDebouncedValue` reutilizavel em `src/hooks/ui/use-debounced-value.ts` ou usar `useDeferredValue` do React 19. O `useDeferredValue` e preferivel pois nao precisa de timeout arbitrario e se integra com Concurrent Features.

```typescript
// DEPOIS (React 19)
const [search, setSearch] = useState('')
const deferredSearch = useDeferredValue(search)
// usar deferredSearch nas queries
```

### 2C: Outros setTimeout

| Arquivo | Linhas | Problema | Acao |
|---------|--------|----------|------|
| `src/components/dashboard/billing/billing-cancel-dialog.tsx` | 67 | `setTimeout(1000)` antes de reload | Substituir por `router.refresh()` |
| `src/app/(auth)/accept-invitation/[invitationId]/page.tsx` | 158 | `setTimeout(1000)` antes de accept | Remover delay, executar direto |
| `src/app/(auth)/sign-up/page.tsx` | 77 | `setTimeout(1000)` para session sync | Usar `await` na session, remover delay |
| `src/app/(public)/billing/success/page.tsx` | 23 | `setTimeout(8000)` para redirect | Aceitavel — UX intencional |
| `src/components/landing/LandingPricing.tsx` | 169 | `setTimeout(3000)` reset error | Aceitavel — UX intencional |
| `src/components/dashboard/billing/plan-selector.tsx` | 128 | `setTimeout(3000)` reset error | Aceitavel — UX intencional |

---

## Fase 3: Eliminar useEffect para Sincronizacao de Estado

**Impacto**: Alto — causa re-renders cascata e bugs de stale closure.

### 3A: Form State Sync (Padrao: `key` prop ou `defaultValues`)

| Arquivo | Linhas | Problema | Solucao |
|---------|--------|----------|---------|
| `src/components/dashboard/account/my-account-content.tsx` | 89-94 | `useEffect` sincroniza account → state | Usar `defaultValue` nos inputs com `key={account?.id}` |
| `src/components/dashboard/account/my-account-content.tsx` | 96-101 | `useEffect` sincroniza org → state | Idem |
| `src/components/dashboard/item-categories/category-form-drawer.tsx` | 62-82 | `useEffect` reseta form no open | Usar `key={category?.id ?? 'new'}` no form |
| `src/components/dashboard/items/item-form-drawer.tsx` | 78 | `useEffect` reseta form no open | Idem |
| `src/components/dashboard/settings/pipeline-settings.tsx` | 187-194 | `useEffect` reseta dialog form | Usar `key` prop |
| `src/components/dashboard/settings/company-data-section.tsx` | 171 | `useEffect` limpa preview | Mover para callback de onSuccess da mutation |

### 3B: Derived State (Padrao: Computar inline)

| Arquivo | Linhas | Problema | Solucao |
|---------|--------|----------|---------|
| `src/components/dashboard/account/team-access-content.tsx` | 223-233 | `useEffect` seleciona membro ativo | Computar `selectedMember` inline: `members?.[0]` |
| `src/components/dashboard/account/team-access-content.tsx` | 235-240 | `useEffect` sincroniza permissions | Computar `draftOverrides` como derivacao de `memberPermissionsQuery.data` |
| `src/components/dashboard/account/team-access-content.tsx` | 258-263 | `useEffect` valida inviteRole | Computar `validatedRole` inline |
| `src/components/dashboard/whatsapp/inbox/instance-selector.tsx` | 32 | `useEffect` auto-seleciona instancia unica | Usar `onSuccess` do query ou derivar |
| `src/components/dashboard/organization/organization-selector.tsx` | 33 | `useEffect` auto-seleciona org unica | Idem |
| `src/components/dashboard/layout/header-actions.tsx` | 34 | `useEffect` sincroniza contexto | Mover para event handler |

### 3C: Redirect Effects

| Arquivo | Linhas | Problema | Solucao |
|---------|--------|----------|---------|
| `src/hooks/auth/use-protected-route.ts` | 15, 36 | `useEffect` redireciona em auth change | Mover para `src/proxy.ts` (server-side redirect) |
| `src/app/(public)/billing/success/page.tsx` | 22 | `useEffect` redirect com timer | Aceitavel — UX intencional |

### 3D: Usos Aceitaveis de useEffect (NAO ALTERAR)

Estes sao efeitos de sincronizacao com APIs externas do browser, nao de fluxo de dados:

| Arquivo | Motivo |
|---------|--------|
| `src/hooks/ui/use-keyboard-shortcuts.ts` | Event listener DOM — aceitavel |
| `src/hooks/ui/use-mobile.ts` | MediaQuery listener — aceitavel |
| `src/components/landing/LandingHeader.tsx` | Scroll listener — aceitavel |
| `src/components/ui/carousel.tsx` | Embla API sync — aceitavel (lib externa) |
| `src/components/ui/sidebar.tsx` | Keyboard shortcut — aceitavel |
| `src/components/ui/calendar.tsx` | Focus management — aceitavel |
| `src/components/dashboard/whatsapp/inbox/chat-window.tsx` | Scroll to bottom — aceitavel |
| `src/app/error.tsx` | Console.error — aceitavel |
| `src/app/dashboard/design-system/design-system-content.tsx` | IntersectionObserver — aceitavel |
| `src/components/dashboard/sidebar/user-dropdown-menu.tsx` | Hydration fix (mounted) — aceitavel |

---

## Fase 4: Fetch Calls Sem ORGANIZATION_HEADER

**Impacto**: Medio — causa 403 em contexto multi-org.

| Arquivo | Linhas | Endpoint |
|---------|--------|----------|
| `src/app/dashboard/tickets/page.tsx` | 297 | `/api/v1/ticket-stages` |
| `src/components/dashboard/whatsapp/inbox/ticket-panel.tsx` | 147 | `/api/v1/ticket-stages` |

**Solucao**: Adicionar `[ORGANIZATION_HEADER]: organizationId` em todos os fetches client-side para endpoints que exigem contexto de org.

---

## Fase 5: Query Keys e Consistencia

**Impacto**: Baixo — afeta cache hit rate.

### 5A: Variaveis Faltando na QueryKey

Garantir que toda variavel usada em `queryFn` esteja representada na `queryKey`:

```typescript
// ERRADO
queryKey: ['members']
queryFn: () => fetch(`/api/v1/organizations/${orgId}/members`)

// CORRETO
queryKey: ['members', { organizationId: orgId }]
queryFn: () => fetch(`/api/v1/organizations/${orgId}/members`)
```

### 5B: Padrao de QueryKey

Adotar estrutura uniforme:

```typescript
queryKey: [dominio, { ...filtros }]
// Exemplos:
queryKey: ['ai-insights', { status: 'SUGGESTION', organizationId }]
queryKey: ['ticket-stages', { organizationId }]
queryKey: ['audit-logs', { ...params, organizationId }]
```

---

## Fase 6: Limpeza de Codigo

**Impacto**: Baixo — higiene e manutencao.

### 6A: Console.log de Debug

| Arquivo | Linhas | Acao |
|---------|--------|------|
| `src/components/dashboard/whatsapp/inbox/chat-window.tsx` | 39-47 | Remover `useEffect` de debug log |
| `src/hooks/whatsapp/use-whatsapp-onboarding.ts` | 78 | Remover `console.log` |

### 6B: Conversao para Server Components

| Arquivo | Oportunidade |
|---------|-------------|
| `src/app/(auth)/accept-invitation/[invitationId]/page.tsx` | Fetch de invitation preview pode ser server-side |

---

## Fase 7: History Sync via Centrifugo

**Impacto**: Baixo — ja funciona com refetchInterval.

| Arquivo | Estado Atual | Melhoria |
|---------|-------------|----------|
| `src/hooks/whatsapp/use-history-sync-status.ts` | Polling 5s/30s | Considerar publicar status via canal Centrifugo existente |

Postergar — depende de mudanca no backend.

---

## Criterios de Aceite

1. Zero `cache: 'no-store'` em codigo client-side
2. Zero `setInterval` para popup polling (substituido por focus listener)
3. Zero `useEffect` para sincronizacao de estado derivado ou form state
4. 100% dos fetches client-side com `ORGANIZATION_HEADER` quando aplicavel
5. QueryKeys consistentes com todas as dependencias
6. Zero `console.log` de debug em producao
7. `npm run lint` passa sem erros
8. `npm run build` passa sem erros
9. Testes existentes continuam passando

## Ordem de Execucao

```
Fase 1 (cache: 'no-store')     → 15 min  → commit
Fase 2A (popup polling)         → 20 min  → commit
Fase 2B (debounce)              → 30 min  → commit
Fase 2C (setTimeout cleanup)    → 15 min  → commit
Fase 3A (form state sync)       → 30 min  → commit
Fase 3B (derived state)         → 30 min  → commit
Fase 3C (redirect effects)      → 15 min  → commit
Fase 4 (org header)             → 10 min  → commit
Fase 5 (query keys)             → 20 min  → commit
Fase 6 (limpeza)                → 10 min  → commit
```

Cada fase deve ser um commit isolado para facilitar revert se necessario.
