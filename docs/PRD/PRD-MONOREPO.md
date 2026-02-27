# PRD — Migração para Monorepo WhaTrack

**Status:** Draft
**Data:** 2026-02-26
**Versão:** 1.2

---

## 1. Contexto e Motivação

O WhaTrack é atualmente uma aplicação Next.js monolítica com frontend, API routes (89 endpoints) e lógica de negócio num único projeto. À medida que o produto cresce, surgem limitações:

- **Mastra AI** roda embedded no Next.js, sem Studio acessível em desenvolvimento
- **Ausência de cliente mobile** — não há como compartilhar lógica entre web e React Native futuramente
- **Escalonamento acoplado** — escalar AI significa escalar toda a aplicação web
- **Package manager lento** — npm com dependências pesadas impacta DX

A migração para monorepo resolve todos esses pontos sem reescrever a aplicação.

---

## 2. Objetivos

- Isolar o Mastra em servidor próprio com Studio acessível em dev
- Preparar a base para um app React Native sem duplicação de código
- Separar a API em camada independente consumível por web e mobile
- Melhorar DX com Bun (installs mais rápidos, runtime mais performático no Mastra)
- Manter zero downtime — migração incremental sem quebrar o produto atual

---

## 3. Não está no escopo deste PRD

- Reescrever features existentes
- Migrar para outro banco de dados
- Desenvolver features de negócio no app React Native (apenas preparar a base + login PoC)
- Mudar provider de deployment (Vercel continua)
- Implementar novos agentes Mastra

---

## 4. Arquitetura Alvo

```
whatrack/                          ← Monorepo root
├── apps/
│   ├── web/                       ← Next.js 16 (SaaS atual — migrado)
│   ├── api/                       ← Hono API (serviço deployável)
│   ├── mastra/                    ← Mastra Server + Studio (Bun runtime)
│   └── mobile/                    ← React Native (futuro, estrutura criada)
├── packages/
│   ├── db/                        ← Prisma schema + client
│   ├── types/                     ← Tipos e Zod schemas compartilhados
│   └── ui/                        ← Componentes shadcn/ui compartilhados (web)
├── bun.lockb
├── package.json                   ← Workspace root
└── turbo.json                     ← Turborepo pipeline
```

### Fluxo de dados

```
apps/web (Next.js)
  └── Server Actions / RSC → packages/db (direto, sem rede)
  └── Client fetch → apps/api (Hono, via HTTP)

apps/mobile (React Native)
  └── fetch → apps/api (Hono, via HTTP)

apps/mastra
  └── packages/db (direto, lê/escreve insights)
  └── Centrifugo (publica resultados)

apps/api (Hono)
  └── packages/db
  └── packages/types
  └── Better Auth (handler centralizado)
```

---

## 5. Detalhamento dos Pacotes

### `apps/web` — Next.js

- Migração do projeto atual com estrutura preservada
- Server Actions e RSC continuam acessando `packages/db` diretamente (sem latência de rede)
- Autenticação via Better Auth centralizada em `apps/api`
- Remove dependência direta do Mastra (passa a consumir `apps/mastra` via HTTP)
- Cron jobs Vercel permanecem em `/api/v1/jobs/*`

### `apps/mastra` — Mastra Server

- Runtime: **Bun**
- Porta padrão: **4111**
- Expõe Studio em desenvolvimento (`MASTRA_DEV=true`)
- Em produção Studio desabilitado, apenas endpoints de execução
- Consome `packages/db` para ler agentes e escrever insights
- Publica resultados no Centrifugo
- Autenticação por API key interna (não exposto publicamente)

```
apps/mastra/
├── src/
│   ├── agents/          ← Agentes Mastra (migrados de services/ai)
│   ├── workflows/       ← Workflows futuros
│   ├── triggers/        ← Event handlers
│   └── index.ts         ← Entry point (Bun serve)
├── package.json
└── .env
```

### `apps/api` — Hono

- Runtime: **Bun** (serviço standalone)
- Better Auth handler centralizado aqui
- 89 endpoints migrados gradualmente do Next.js
- Tipagem end-to-end com Hono RPC (consumido pelo web e mobile sem cliente HTTP manual), usando `packages/types`
- Middlewares: auth, RBAC, rate limiting, audit logging

```
apps/api/
├── src/
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── whatsapp.ts
│   │   ├── tickets.ts
│   │   ├── meta-ads.ts
│   │   ├── ai-agents.ts
│   │   └── ...
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── rbac.middleware.ts
│   └── index.ts
└── package.json
```

### `packages/db` — Prisma

- Schema atual migrado sem alterações
- Client gerado e exportado para todos os apps
- Migrations gerenciadas aqui (única fonte de verdade)
- Seeds incluídos

### `packages/types` — Tipos Compartilhados

- Schemas Zod atuais de `/src/schemas/` migrados aqui
- Tipos TypeScript de `/src/types/` migrados aqui
- Consumido por web, mobile e api sem duplicação

### `packages/ui` — Componentes (opcional, fase 2)

- Componentes shadcn/ui que possam ser compartilhados
- Somente web por agora (React Native usa componentes nativos)
- Pode ser adiado se não houver componentes compartilháveis imediatos

### `apps/mobile` — React Native (estrutura)

- Apenas scaffolding inicial com Expo
- Consome `apps/api` (via HTTP + tipos compartilhados em `packages/types`)
- Sem features de negócio além de autenticação/login PoC nesta fase

---

## 6. Decisões Técnicas

| Decisão | Escolha | Justificativa |
|---|---|---|
| Package manager | **Bun** | Installs mais rápidos; runtime Bun para Mastra e Hono |
| Monorepo tooling | **Turborepo** | Pipeline inteligente, cache de build, simples de configurar |
| API framework | **Hono** | Suporte oficial Better Auth; roda em Bun/Node/Edge; tipagem RPC |
| Mastra runtime | **Bun** | Performance, compatibilidade nativa com Mastra |
| Next.js runtime | **Node** | Next.js não suporta Bun como runtime ainda |
| Mobile | **Expo** (React Native) | DX melhor, OTA updates, Expo Router |
| Tipos compartilhados | **Zod + TypeScript** | Já usado no projeto; inferência automática |

---

## 7. Plano de Migração (Fases)

### Fase 0 — Preparação (sem quebrar nada)
- [ ] Criar estrutura de diretórios do monorepo
- [ ] Configurar `package.json` root com workspaces Bun
- [ ] Configurar `turbo.json` com pipelines de build/dev/test
- [ ] Criar `packages/db` com Prisma migrado
- [ ] Criar `packages/types` com schemas Zod migrados
- [ ] Mover `apps/web` para novo diretório (ajustar imports)
- [ ] Validar que `apps/web` builda e roda igual ao projeto atual

### Fase 1 — Mastra Server
- [ ] Criar `apps/mastra` com Bun + Mastra
- [ ] Migrar `src/services/ai/` para `apps/mastra/src/agents/`
- [ ] Migrar `src/services/ai/ai-classifier.scheduler.ts` para triggers Mastra
- [ ] Expor endpoints HTTP para o `apps/web` chamar
- [ ] Testar Studio em desenvolvimento
- [ ] Remover dependência Mastra do `apps/web`

### Fase 2 — Hono API
- [ ] Criar `apps/api` com Hono
- [ ] Migrar Better Auth handler para Hono
- [ ] Migrar endpoints por domínio (começar por auth, organizations)
- [ ] Implementar Hono RPC para tipagem end-to-end
- [ ] Atualizar `apps/web` para consumir Hono onde aplicável
- [ ] Manter API routes Next.js como proxy temporário se necessário

### Fase 3 — Mobile Scaffolding
- [ ] Criar `apps/mobile` com Expo + Expo Router
- [ ] Configurar consumo de `apps/api` e `packages/types`
- [ ] Configurar autenticação Better Auth no mobile
- [ ] Tela de login funcional como prova de conceito

### Estratégia de Cutover e Rollback (Zero Downtime)
- [ ] Introduzir feature flag `API_BACKEND_TARGET=next|hono` no `apps/web` para trocar backend sem redeploy estrutural
- [ ] Fazer migração de rotas por domínio com fallback imediato para Next API routes
- [ ] Manter dual-run do Mastra por janela curta (`AI_RUNTIME_TARGET=previous|mastra`) até validar paridade dos insights
- [ ] Definir rollback por fase: rollback = voltar flag para `next`/`previous` + redeploy do app chamador
- [ ] Validar SLOs por fase (taxa de erro, latência p95, sucesso de autenticação) antes de avançar

---

## 8. Ambiente e Variáveis

Cada app terá seu próprio `.env`. Variáveis compartilhadas documentadas em `.env.example` no root.

```
# apps/web/.env
APP_URL=http://localhost:3000
API_URL=http://localhost:3001          ← Hono
MASTRA_URL=http://localhost:4111       ← Mastra (interno)
DATABASE_URL=...
BETTER_AUTH_SECRET=...
# ... demais vars atuais

# apps/mastra/.env
MASTRA_PORT=4111
DATABASE_URL=...
GROQ_API_KEY=...
OPENAI_API_KEY=...
CENTRIFUGO_URL=...
CENTRIFUGO_API_KEY=...
MASTRA_INTERNAL_API_KEY=...           ← Autenticação interna

# apps/api/.env
PORT=3001
DATABASE_URL=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3001
```

---

## 9. Scripts de Desenvolvimento

```json
// turbo.json (Turborepo v2)
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "persistent": true, "cache": false },
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "test": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

```bash
# Root package.json scripts
bun run dev          # Inicia todos os apps em paralelo (Turborepo)
bun run dev:web      # Só Next.js
bun run dev:mastra   # Só Mastra (com Studio)
bun run dev:api      # Só Hono API
bun run build        # Build todos os apps
bun run test         # Testa todos os packages
```

---

## 10. Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Quebrar imports no `apps/web` | Alta | Migrar com alias TypeScript; validar build a cada passo |
| Better Auth em contexto Hono | Média | Better Auth tem suporte oficial Hono; testar auth flow antes de migrar endpoints |
| Prisma em múltiplos apps | Baixa | Um único `packages/db` com client compartilhado; connection pooling via `@prisma/adapter-pg` |
| Bun incompatibilidade com Next.js deps | Baixa | Next.js usa Node runtime; Bun só como package manager no `apps/web` |
| Turborepo cache incorreto | Baixa | Configurar `outputs` corretamente no `turbo.json` |

---

## 11. Critérios de Sucesso

- [ ] `apps/web` em produção com comportamento idêntico ao atual
- [ ] `apps/mastra` com Studio acessível em `localhost:4111` em dev
- [ ] AI insights gerados pelo `apps/mastra` (não mais pelo Next.js)
- [ ] `apps/api` com pelo menos autenticação e organizations migrados
- [ ] `apps/mobile` com tela de login funcional via Hono API
- [ ] `bun run dev` sobe todos os apps com um comando
- [ ] Todos os testes existentes passando no novo contexto

---

## 12. Dependências Externas

Sem nova categoria de infraestrutura paga. Haverá novas dependências de build/runtime no código:

- Bun ≥ 1.1 (package manager + runtime)
- Turborepo ≥ 2.0
- Hono ≥ 4.0
- Expo SDK ≥ 52 (React Native)
- Mastra ≥ 1.7 (já instalado)

---

## 13. Deployment

### Infraestrutura

```
Vercel (free tier)
└── apps/web                        → whatrack.com

Portainer + Docker Swarm (self-hosted)
├── stack: whatrack-api             → api.whatrack.com
├── stack: whatrack-mastra          → sem domínio público (somente rede interna)
├── stack: whatrack-mastra-staging  → mastra-staging.whatrack.com (basic auth)
└── stack: whatrack-infra           → Redis + Centrifugo (já existem)

EAS / Expo (free tier)
└── apps/mobile                     → App Store + Play Store
```

### Reverse Proxy

Traefik (já no Swarm) gerencia roteamento e SSL apenas para serviços públicos. Em produção, o Mastra não recebe router público.

### Dockerfiles

**`apps/mastra/Dockerfile`**
```dockerfile
FROM oven/bun:1-alpine AS base
WORKDIR /app

# Instala dependências
COPY package.json bun.lockb ./
COPY packages/db/package.json ./packages/db/
COPY apps/mastra/package.json ./apps/mastra/
RUN bun install --frozen-lockfile

# Copia código
COPY packages/db ./packages/db
COPY apps/mastra ./apps/mastra

# Gera Prisma client
RUN cd packages/db && bunx prisma generate

EXPOSE 4111
CMD ["bun", "run", "apps/mastra/src/index.ts"]
```

**`apps/api/Dockerfile`**
```dockerfile
FROM oven/bun:1-alpine AS base
WORKDIR /app

COPY package.json bun.lockb ./
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/
RUN bun install --frozen-lockfile

COPY packages/db ./packages/db
COPY packages/types ./packages/types
COPY apps/api ./apps/api

RUN cd packages/db && bunx prisma generate

EXPOSE 3001
CMD ["bun", "run", "apps/api/src/index.ts"]
```

### Stack Files (Docker Swarm)

**`deploy/stacks/whatrack-api.yml`**
```yaml
version: "3.8"

services:
  api:
    image: ghcr.io/seu-usuario/whatrack-api:${TAG:-latest}
    networks:
      - traefik-public
      - whatrack-internal
    environment:
      - PORT=3001
      - DATABASE_URL=${DATABASE_URL}
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_URL=https://api.whatrack.com
      - REDIS_URL=${REDIS_URL}
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.whatrack-api.rule=Host(`api.whatrack.com`)"
        - "traefik.http.routers.whatrack-api.tls.certresolver=letsencrypt"
        - "traefik.http.services.whatrack-api.loadbalancer.server.port=3001"

networks:
  traefik-public:
    external: true
  whatrack-internal:
    external: true
```

**`deploy/stacks/whatrack-mastra.yml`**
```yaml
version: "3.8"

services:
  mastra:
    image: ghcr.io/seu-usuario/whatrack-mastra:${TAG:-latest}
    networks:
      - whatrack-internal
    environment:
      - MASTRA_PORT=4111
      - NODE_ENV=production          # Studio desabilitado em produção
      - DATABASE_URL=${DATABASE_URL}
      - GROQ_API_KEY=${GROQ_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - CENTRIFUGO_URL=${CENTRIFUGO_URL}
      - CENTRIFUGO_API_KEY=${CENTRIFUGO_API_KEY}
      - MASTRA_INTERNAL_API_KEY=${MASTRA_INTERNAL_API_KEY}
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure

networks:
  whatrack-internal:
    external: true
```

### CI/CD com GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      api: ${{ steps.changes.outputs.api }}
      mastra: ${{ steps.changes.outputs.mastra }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: changes
        with:
          filters: |
            api:
              - 'apps/api/**'
              - 'packages/db/**'
              - 'packages/types/**'
              - 'package.json'
              - 'bun.lockb'
              - 'turbo.json'
            mastra:
              - 'apps/mastra/**'
              - 'packages/db/**'
              - 'packages/types/**'
              - 'package.json'
              - 'bun.lockb'
              - 'turbo.json'

  deploy-api:
    needs: detect-changes
    if: needs.detect-changes.outputs.api == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build e push imagem
        run: |
          docker build -f apps/api/Dockerfile -t ghcr.io/${{ github.repository }}/whatrack-api:${{ github.sha }} .
          docker push ghcr.io/${{ github.repository }}/whatrack-api:${{ github.sha }}
      - name: Redeploy via Portainer webhook
        run: curl -X POST ${{ secrets.PORTAINER_WEBHOOK_API }}

  deploy-mastra:
    needs: detect-changes
    if: needs.detect-changes.outputs.mastra == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build e push imagem
        run: |
          docker build -f apps/mastra/Dockerfile -t ghcr.io/${{ github.repository }}/whatrack-mastra:${{ github.sha }} .
          docker push ghcr.io/${{ github.repository }}/whatrack-mastra:${{ github.sha }}
      - name: Redeploy via Portainer webhook
        run: curl -X POST ${{ secrets.PORTAINER_WEBHOOK_MASTRA }}
```

**O Portainer webhook por stack** faz pull da nova imagem e recria os containers automaticamente — sem precisar de acesso SSH ao servidor.

### Mastra Studio em Staging

Em ambiente de staging, habilitar Studio e expor via Traefik com autenticação básica:

```bash
NODE_ENV=development   # Studio ativo
MASTRA_PORT=4111
```

Acessível em `https://mastra-staging.whatrack.com`. Em produção, manter Mastra sem domínio público.

### Custo Total

| Serviço | Custo |
|---|---|
| Vercel (apps/web) | Free tier |
| Portainer/Swarm (já existe) | $0 adicional |
| GHCR (registry de imagens) | Free tier (pacotes públicos/privados) |
| EAS (apps/mobile) | Free tier (30 builds/mês) |
| **Total adicional** | **$0/mês** |

---

## 14. Tutorial de Implementação (End-to-End)

Este tutorial descreve a implementação completa em servidores separados, com `apps/mastra` interno (sem exposição pública) em produção.

### 14.1 Topologia de produção (3 servidores)

```text
Internet
  ├── https://whatrack.com                -> Vercel (apps/web)
  └── https://api.whatrack.com            -> Server API (Traefik + apps/api)

Rede privada (VPC/VPN/WireGuard/Tailscale)
  ├── Server API       10.20.0.10
  ├── Server Mastra    10.20.0.20  (sem rota pública)
  └── Server Infra     10.20.0.30  (Postgres/Redis/Centrifugo)
```

Regras de arquitetura:
- Browser e mobile chamam apenas `apps/api`.
- `apps/api` chama `apps/mastra` pela rede privada.
- `apps/mastra` nunca recebe tráfego direto de internet em produção.

### 14.2 Ordem de implementação (runbook)

1. Preparar monorepo (Fase 0).
2. Extrair e subir `apps/mastra` internamente (Fase 1).
3. Extrair e subir `apps/api` público (Fase 2).
4. Migrar rotas por domínio com feature flag e rollback rápido.
5. Criar `apps/mobile` (login PoC) apontando para `apps/api`.

### 14.3 Fase 0 na prática (bootstrap do monorepo)

1. Criar estrutura:
```bash
mkdir -p apps/{web,api,mastra,mobile} packages/{db,types,ui}
```
2. Mover o Next atual para `apps/web`.
3. Mover Prisma para `packages/db`.
4. Mover Zod/types para `packages/types`.
5. Criar `turbo.json` com `tasks`.
6. Validar:
```bash
bun install
bun run build
bun run dev:web
```

Critério de saída da fase: `apps/web` idêntico ao comportamento atual.

### 14.4 Fase 1 na prática (Mastra interno)

1. Criar `apps/mastra` com entrypoint HTTP em `:4111`.
2. Migrar `src/services/ai/*` para `apps/mastra/src/agents`.
3. Implementar autenticação interna por header:
```text
x-internal-api-key: <MASTRA_INTERNAL_API_KEY>
```
4. Desabilitar Studio em produção:
```bash
NODE_ENV=production
MASTRA_DEV=false
```
5. Subir `apps/mastra` no Server Mastra sem ingress público.

### 14.5 Fase 2 na prática (Hono API público)

1. Criar `apps/api` com Better Auth e rotas por domínio.
2. Definir integração interna com Mastra via env:
```bash
MASTRA_BASE_URL=http://10.20.0.20:4111
MASTRA_INTERNAL_API_KEY=***
```
3. Toda chamada Mastra sai do backend (`apps/api`), nunca do client.
4. Migrar endpoints de forma incremental (auth -> organizations -> demais).
5. Manter proxy temporário para rotas legadas enquanto houver migração.

Exemplo de chamada segura `apps/api -> apps/mastra`:
```ts
const response = await fetch(`${process.env.MASTRA_BASE_URL}/v1/execute`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-internal-api-key": process.env.MASTRA_INTERNAL_API_KEY!,
  },
  body: JSON.stringify(payload),
});
```

### 14.6 Rede privada e firewall (obrigatório)

No Server Mastra:
- Política padrão: `deny incoming`.
- Liberar `4111/tcp` apenas para IP privado do Server API (`10.20.0.10`).
- Liberar `22/tcp` apenas para IP administrativo.

Exemplo com UFW:
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow from 10.20.0.10 to any port 4111 proto tcp
ufw allow from <SEU_IP_ADMIN>/32 to any port 22 proto tcp
ufw enable
```

No Server API:
- Expor apenas `80/443` para internet.
- Não expor `3001` diretamente se Traefik já estiver fazendo proxy interno.

Exemplo com UFW:
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow from <SEU_IP_ADMIN>/32 to any port 22 proto tcp
ufw enable
```

### 14.7 DNS e reverse proxy (produção x staging)

Produção:
- Criar DNS apenas para `api.whatrack.com` e `whatrack.com`.
- Não criar `mastra.whatrack.com`.
- Não configurar router Traefik público para o Mastra.

Staging:
- Criar `mastra-staging.whatrack.com`.
- Habilitar Studio (`NODE_ENV=development` / `MASTRA_DEV=true`).
- Proteger com Basic Auth no Traefik + IP allowlist se possível.

### 14.8 Stack do Mastra em produção (sem exposição)

Checklist obrigatório no `whatrack-mastra.yml`:
- Sem rede `traefik-public`.
- Sem labels de router Traefik.
- Sem `ports` publicados para internet.
- Apenas rede interna (`whatrack-internal`) ou bind em IP privado.

Se não estiver usando rede overlay entre hosts, publicar somente em IP privado:
```yaml
ports:
  - "10.20.0.20:4111:4111"
```

### 14.9 Variáveis de ambiente por serviço (produção)

`apps/api`:
```bash
PORT=3001
BETTER_AUTH_URL=https://api.whatrack.com
BETTER_AUTH_SECRET=***
DATABASE_URL=***
MASTRA_BASE_URL=http://10.20.0.20:4111
MASTRA_INTERNAL_API_KEY=***
```

`apps/mastra`:
```bash
MASTRA_PORT=4111
NODE_ENV=production
MASTRA_DEV=false
DATABASE_URL=***
OPENAI_API_KEY=***
GROQ_API_KEY=***
CENTRIFUGO_URL=***
CENTRIFUGO_API_KEY=***
MASTRA_INTERNAL_API_KEY=***
```

### 14.10 CI/CD recomendado (ordem de deploy)

Quando mudar `packages/db` ou `packages/types`, considerar deploy coordenado:
1. Deploy `apps/mastra`.
2. Deploy `apps/api`.
3. Smoke test interno API -> Mastra.
4. Ativar flag de cutover para novas rotas.

Em mudanças só de API, deploy apenas `apps/api`.
Em mudanças só de Mastra, deploy apenas `apps/mastra`.

### 14.11 Validação de segurança e funcionamento

Testes externos (internet):
```bash
curl -i https://api.whatrack.com/health
```
Esperado: `200`.

```bash
curl -i https://mastra.whatrack.com
```
Esperado: falha de DNS ou bloqueio (não disponível publicamente).

Teste interno (no Server API):
```bash
curl -i http://10.20.0.20:4111/health -H "x-internal-api-key: $MASTRA_INTERNAL_API_KEY"
```
Esperado: `200`.

### 14.12 Rollback operacional (5 minutos)

1. Voltar flag `API_BACKEND_TARGET=next` no `apps/web` (se aplicável).
2. Voltar flag `AI_RUNTIME_TARGET=previous` no serviço chamador.
3. Redeploy do `apps/web`/`apps/api`.
4. Revalidar login, rota crítica e geração de insight.
5. Manter `apps/mastra` isolado enquanto investiga incidente.

Critério para encerrar rollback:
- Erro de autenticação normalizado.
- Latência p95 dentro do baseline.
- Taxa de sucesso de rotas críticas estabilizada.
