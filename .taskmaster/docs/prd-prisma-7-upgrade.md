# PRD: Upgrade Prisma 6 → Prisma 7

**Status:** Planejado  
**Prioridade:** Alta  
**Data:** Dezembro 2024  
**Owner:** Thiago  

---

## 1. Objetivo

Atualizar o projeto de Prisma 6 para Prisma 7 para obter:
- **3x mais rápido** na execução de queries
- **90% menor bundle size** (crítico para Vercel Edge)
- **Melhor type safety** (70% mais rápido em type checking)
- **Suporte futuro** (Prisma 6 será descontinuado)

---

## 2. Contexto

### Por que agora?
- Projeto está em produção na Vercel
- Performance é crítica para Edge Functions
- Bundle size impacta diretamente em cold starts
- Comunidade já validou upgrade com sucesso

### Impacto esperado
- **Performance:** Queries mais rápidas, menos CPU/memória
- **Bundle:** Redução significativa para deploy
- **DX:** Melhor integração com file watchers e dev tools
- **Risco:** Médio (breaking changes bem documentadas)

---

## 3. Mudanças Principais

### 3.1 Rust-Free Client
- Cliente migrado de Rust para TypeScript
- Elimina overhead de comunicação Rust ↔ JavaScript
- Suporte nativo para Deno, Bun, Cloudflare Workers

### 3.2 Geração de Código
**Antes (Prisma 6):**
```
node_modules/@prisma/client/
```

**Depois (Prisma 7):**
```
prisma/generated/prisma/client/
```

Benefício: Integração com file watchers, dev tools, build pipeline

### 3.3 Database Adapter (NOVO)
Prisma 7 requer adapter específico para o banco de dados:
- **PostgreSQL (Neon):** `@prisma/adapter-pg`
- Adapter é responsável pela conexão TCP direta
- Substitui o engine Rust anterior

### 3.4 Configuração Dinâmica
Novo arquivo `prisma.config.ts`:
```typescript
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
```

### 3.5 Provider & Schema
- `prisma-client-js` → `prisma-client`
- Campo `output` obrigatório: `./generated/prisma`
- **Remover `url = env("DATABASE_URL")`** da datasource (vai para prisma.config.ts)

### 3.6 ESM Obrigatório
- `"type": "module"` em package.json
- TypeScript ESM compatible
- Imports com `.js` extension

---

## 4. Requisitos Técnicos

### Mínimos
- Node.js: 18.0.0+ (atual: ✅)
- TypeScript: 5.0+ (atual: ✅)
- Next.js: 16.0.0+ (atual: ✅)

### Configuração
- `package.json`: `"type": "module"`
- `tsconfig.json`: ESM support
- `prisma.schema`: Atualizar provider e output
- `prisma.config.ts`: Novo arquivo de config

---

## 5. Plano de Execução

### Fase 1: Preparação ✅
- ✅ Criar branch `feat/prisma-7-upgrade`
- ✅ Documentar versões atuais

### Fase 2: Atualização ✅
- ✅ Atualizar `package.json`: `prisma@7`, `@prisma/client@7`
- ✅ Adicionar `@prisma/adapter-pg@7`
- ✅ Adicionar `"type": "module"`
- ✅ Atualizar `prisma.config.ts` (remover `engine: 'classic'`)
- ✅ Atualizar `prisma.schema`:
  - Provider: `prisma-client-js` → `prisma-client`
  - Adicionar `output = "./generated/prisma"`
  - Remover `url = env("DATABASE_URL")` da datasource

### Fase 3: Atualização de Imports ✅
- ✅ Atualizar `src/lib/prisma.ts` com adapter PrismaPg
- ✅ Atualizar `prisma/seeds/index.ts` com adapter PrismaPg
- ✅ Atualizar imports: `@prisma/client` → `../generated/prisma/client.js`

### Fase 4: Configuração ESM ✅
- ✅ Atualizar `tsconfig.json`:
  - `target`: ES2017 → ES2023
  - `module`: esnext → ESNext
  - `moduleResolution`: bundler → node

### Fase 5: Próximos Passos (Pendente)
- [ ] `npm install` - Instalar dependências
- [ ] `npx prisma generate` - Gerar novo Prisma Client
- [ ] `npm run build` - Verificar build
- [ ] `npm run dev` - Testar dev server
- [ ] `npx prisma migrate dev` - Testar migrations

### Fase 6: Validação (Pendente)
- [ ] Comparar bundle size antes/depois
- [ ] Verificar performance em queries
- [ ] Validar type checking
- [ ] Testar em staging (Vercel preview)

### Fase 7: Deploy (Pendente)
- [ ] Merge para main
- [ ] Deploy na Vercel
- [ ] Monitorar logs e performance
- [ ] Validar em produção

---

## 6. Arquivos a Modificar

### Críticos
- `package.json` - Versões, type: module
- `prisma.schema` - Provider, output
- `src/lib/prisma.ts` - Import path
- `tsconfig.json` - ESM config (se necessário)

### Secundários (buscar/substituir)
- `src/app/**/*.ts` - Imports de Prisma
- `src/services/**/*.ts` - Imports de Prisma
- `src/server/**/*.ts` - Imports de Prisma

### Novos
- `prisma.config.ts` - Configuração dinâmica
- `src/generated/prisma/` - Código gerado (gitignore)

---

## 7. Checklist de Validação

### Build & Dev
- [ ] `npm install` sem erros
- [ ] `npm run dev` funciona
- [ ] `npm run build` sem erros
- [ ] `npm run lint` sem erros
- [ ] `npm run type-check` sem erros

### Prisma
- [ ] `npx prisma generate` funciona
- [ ] `npx prisma db push` funciona
- [ ] `npx prisma migrate dev` funciona
- [ ] Queries básicas funcionam em dev

### Performance
- [ ] Bundle size reduzido (verificar com `npm run build`)
- [ ] Dev server inicia mais rápido
- [ ] Type checking mais rápido

### Produção (Vercel)
- [ ] Deploy sem erros
- [ ] Logs sem warnings de Prisma
- [ ] Queries funcionam em produção
- [ ] Performance melhorada

---

## 8. Rollback Plan

Se algo der errado:

```bash
# Reverter branch
git reset --hard HEAD~1

# Reinstalar versão anterior
npm install prisma@6 @prisma/client@6

# Regenerar client
npx prisma generate
```

---

## 9. Riscos & Mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|--------|-----------|
| Breaking changes não detectados | Baixa | Alto | Testes completos em staging |
| Import paths incorretos | Média | Médio | Buscar/substituir cuidadoso |
| Migrations falharem | Baixa | Alto | Backup do banco antes |
| Performance não melhorar | Muito Baixa | Baixo | Benchmarks antes/depois |

---

## 10. Métricas de Sucesso

- ✅ Build sem erros
- ✅ Bundle size reduzido em 90%
- ✅ Queries 3x mais rápidas (validar com benchmarks)
- ✅ Type checking 70% mais rápido
- ✅ Deploy em Vercel sem issues
- ✅ Produção estável por 24h

---

## 11. Timeline

| Fase | Duração | Data Estimada |
|------|---------|---------------|
| Preparação | 30 min | Hoje |
| Atualização | 45 min | Hoje |
| Imports | 30 min | Hoje |
| Testes | 30 min | Hoje |
| Validação | 15 min | Hoje |
| Deploy | 15 min | Hoje |
| **Total** | **~2h45m** | **Hoje** |

---

## 12. Referências

- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
- [Prisma 7 Release Blog](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0)
- [Prisma Config Reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference)

---

## 13. Notas

- Projeto usa Next.js 16 (suporta ESM perfeitamente)
- Vercel será o maior beneficiário (bundle size + edge functions)
- Comunidade já validou upgrade com sucesso
- Sem dependências externas que impeçam upgrade
