# Quick Start: PRD-003 Performance

Este guia foca nas ações de **maior impacto imediato** (Low Hanging Fruits) para resolver a percepção de lentidão no whatrack.

---

## 🚀 Top 3 Prioridades (The "Quick Wins")

### 1. Feedback Visual Instantâneo (T1)
O usuário sente o app "lento" porque o `router.push` do Next.js aguarda o fetch da nova página sem dar sinal de vida.
- **Ação:** Envolver navegações em `useTransition` e desabilitar botões com `isPending`.
- **Onde:** `topbar.tsx` e `user-dropdown-menu.tsx`.

### 2. Skeletons e loading.tsx (T2)
Evitar a tela branca (Flash of Unstyled Content) durante navegações no dashboard.
- **Ação:** Copiar o `DashboardPageSkeleton` para arquivos `loading.tsx` nas rotas críticas.
- **Onde:** `src/app/(dashboard)/[org]/[project]/...`

### 3. Matar o N+1 de Slugs (T4)
Atualmente, criar uma organização pode disparar até 100 queries sequenciais no banco.
- **Ação:** Mudar para uma query única usando `where: { slug: { in: candidates } }`.
- **Onde:** `organization-management.service.ts`.

---

## 🛠️ Comando para Verificação Rápida

Para encontrar `await`s sequenciais que poderiam ser `Promise.all`:

```bash
grep -rA 1 "await" src/features | grep -B 1 "await"
```

## 📈 Como Medir o Sucesso

1. **UX:** Abra o DevTools, aba **Network**, emule **"Fast 3G"**. Clique em trocar de projeto. Se o botão mostrar um spinner em < 50ms, a T1 está ok.
2. **LCP:** No Lighthouse, a métrica de Largest Contentful Paint deve cair após a T5 (removendo `unoptimized: true`).
3. **DB:** O log do Prisma deve mostrar apenas 1 query de SELECT para validação de slug em vez de múltiplas.

---

## ⚠️ Atenção
Não esqueça de adicionar domínios de imagens externas no `next.config.ts` antes de remover o `unoptimized: true`, caso contrário as imagens de perfil/logos podem quebrar em produção.
