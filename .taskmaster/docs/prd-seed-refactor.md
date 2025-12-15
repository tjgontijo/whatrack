# PRD: Refatoração do Seed - Simplificação e OWNER_EMAIL

## Visão Geral

Refatorar o sistema de seeds do Prisma para remover a criação automática de usuários e organizações, mantendo apenas o seed de planos de billing. Implementar a variável de ambiente `OWNER_EMAIL` para definir automaticamente o role de dono do SaaS.

## Problema que Resolve

- Seeds atuais criam usuários e organizações hardcoded, dificultando testes reais
- Não há forma de definir o dono do SaaS sem editar código
- Limpeza do banco durante seed remove dados importantes em desenvolvimento
- Usuários devem ser criados pelo fluxo normal de sign-up

## Objetivos

1. **Simplificar seeds**: Manter apenas billing plans
2. **Permitir sign-up real**: Usuários criados pelo front-end
3. **Definir owner via env**: `OWNER_EMAIL` define role de dono do SaaS
4. **Seed idempotente**: Pode rodar múltiplas vezes sem problemas

## Usuários

- **Desenvolvedor**: Roda seed para configurar ambiente
- **Dono do SaaS**: Recebe role `owner` automaticamente pelo email

---

# Situação Atual

## Estrutura de Seeds

```
prisma/
├── seed.ts                    # Entry point
└── seeds/
    ├── index.ts               # Orquestrador
    ├── seed-billing.ts        # ✅ MANTER
    ├── seed-users.ts          # ❌ REMOVER
    ├── seed-organization.ts   # ❌ REMOVER
    └── seed-meta-ads.ts       # ❌ REMOVER (dados de teste)
```

## Problemas Identificados

### 1. `seed-users.ts`
- Cria usuário hardcoded com email e senha fixos
- Usa `auth.api.signUpEmail()` diretamente
- Cria member na organização

### 2. `seed-organization.ts`
- Cria organização "WhaTrack" hardcoded
- Slug fixo que pode conflitar

### 3. `index.ts`
- `cleanDatabase()` apaga TODOS os dados
- Ordem de execução depende de organization existir

### 4. Falta de OWNER_EMAIL
- Não há forma de definir quem é o dono do SaaS
- Role `owner` em User nunca é usado

---

# Solução Proposta

## 1. Novo `prisma/seeds/index.ts`

```typescript
import { PrismaClient } from '@prisma/client'
import { seedBillingPlans } from './seed-billing'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  try {
    // Seed billing plans (idempotente - usa upsert)
    await seedBillingPlans(prisma)

    console.log('✅ Seed concluído com sucesso!')
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error)
    throw error
  }
}

export { main }

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('❌ Falha na execução do seed')
      console.error(error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
      console.log('🔌 Conexão com o banco de dados encerrada.')
    })
}
```

## 2. Manter `seed-billing.ts` (já idempotente)

O arquivo atual já usa `upsert`, então pode rodar múltiplas vezes sem problemas.

## 3. Remover arquivos desnecessários

- `prisma/seeds/seed-users.ts` → DELETAR
- `prisma/seeds/seed-organization.ts` → DELETAR
- `prisma/seeds/seed-meta-ads.ts` → DELETAR (se existir)

## 4. Implementar OWNER_EMAIL

### 4.1 Variável de Ambiente

```env
# .env
OWNER_EMAIL=tjgontijo@gmail.com
```

```env
# .env.example
# Email do dono do SaaS - recebe role 'owner' automaticamente
OWNER_EMAIL=
```

### 4.2 Hook no Better Auth

```typescript
// src/lib/auth/auth.ts

import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin, organization } from 'better-auth/plugins'
import { prisma } from '../prisma'

const OWNER_EMAIL = process.env.OWNER_EMAIL

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  basePath: '/api/v1/auth',

  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  plugins: [
    admin(),
    organization()
  ],

  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false,
      },
    },
  },

  // Hook para definir role de owner
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Se o email do usuário é o OWNER_EMAIL, atualiza para role 'owner'
          if (OWNER_EMAIL && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: 'owner' },
            })
            console.log(`🔑 Usuário ${user.email} definido como owner do SaaS`)
          }
        },
      },
    },
  },
})
```

### 4.3 Alternativa: Middleware de Verificação

Se o hook não funcionar bem, criar um middleware:

```typescript
// src/lib/auth/check-owner.ts

import { prisma } from '../prisma'

const OWNER_EMAIL = process.env.OWNER_EMAIL

export async function ensureOwnerRole(userId: string, email: string) {
  if (!OWNER_EMAIL) return

  if (email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (user?.role !== 'owner') {
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'owner' },
      })
    }
  }
}
```

---

# Arquitetura

## Fluxo de Seed

```
┌─────────────────────────────────────────────────────────────┐
│                    npm run db:seed                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    prisma/seed.ts                            │
│  - Carrega .env                                              │
│  - Configura DIRECT_URL                                      │
│  - Importa e executa main()                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                prisma/seeds/index.ts                         │
│  - Executa seedBillingPlans()                                │
│  - NÃO limpa banco                                           │
│  - NÃO cria usuários                                         │
│  - NÃO cria organizações                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              prisma/seeds/seed-billing.ts                    │
│  - Upsert de planos (Free, Starter, Pro, Business)          │
│  - Upsert de preços por plano                                │
│  - Idempotente: pode rodar múltiplas vezes                   │
└─────────────────────────────────────────────────────────────┘
```

## Fluxo de Criação de Usuário

```
┌─────────────────────────────────────────────────────────────┐
│                    /sign-up (frontend)                       │
│  - Usuário preenche formulário                               │
│  - Chama API de sign-up                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Better Auth                               │
│  - Cria usuário no banco                                     │
│  - Dispara hook databaseHooks.user.create.after              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Hook after create                         │
│  - Verifica se email === OWNER_EMAIL                         │
│  - Se sim: atualiza role para 'owner'                        │
│  - Se não: mantém role 'user' (default)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Continua sign-up                          │
│  - Cria Organization                                         │
│  - Cria Member (owner da org)                                │
│  - Redireciona para dashboard                                │
└─────────────────────────────────────────────────────────────┘
```

---

# Tasks

## Task 1: Simplificar `prisma/seeds/index.ts`

**Arquivo:** `prisma/seeds/index.ts`

**Ações:**
1. Remover import de `seedOrganization`
2. Remover import de `seedUsers`
3. Remover função `cleanDatabase()`
4. Remover chamadas a `seedOrganization()` e `seedUsers()`
5. Manter apenas `seedBillingPlans()`

**Código final:**
```typescript
import { PrismaClient } from '@prisma/client'
import { seedBillingPlans } from './seed-billing'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  try {
    // Seed billing plans (idempotente - usa upsert)
    await seedBillingPlans(prisma)

    console.log('✅ Seed concluído com sucesso!')
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error)
    throw error
  }
}

export { main }

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('❌ Falha na execução do seed')
      console.error(error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
      console.log('🔌 Conexão com o banco de dados encerrada.')
    })
}
```

## Task 2: Deletar arquivos de seed desnecessários

**Arquivos a deletar:**
- `prisma/seeds/seed-users.ts`
- `prisma/seeds/seed-organization.ts`
- `prisma/seeds/seed-meta-ads.ts` (se existir)

## Task 3: Atualizar `seed-billing.ts`

**Arquivo:** `prisma/seeds/seed-billing.ts`

**Ações:**
1. Remover função `cleanBillingData()` (não será mais usada)
2. Manter apenas `seedBillingPlans()` com upsert

## Task 4: Adicionar OWNER_EMAIL ao `.env.example`

**Arquivo:** `.env.example`

**Adicionar:**
```env
# ===========================================
# OWNER DO SAAS
# ===========================================
# Email do dono do SaaS - recebe role 'owner' automaticamente
OWNER_EMAIL=
```

## Task 5: Implementar hook no Better Auth

**Arquivo:** `src/lib/auth/auth.ts`

**Ações:**
1. Adicionar constante `OWNER_EMAIL` do env
2. Adicionar `databaseHooks.user.create.after`
3. Verificar email e atualizar role se necessário

## Task 6: Criar helper de verificação de owner

**Arquivo:** `src/lib/auth/check-owner.ts` (novo)

**Propósito:** Função utilitária para verificar/garantir role de owner em outros contextos.

## Task 7: Atualizar documentação

**Arquivo:** `README.md` ou documentação relevante

**Adicionar:**
- Instruções sobre `OWNER_EMAIL`
- Como rodar seed
- Fluxo de criação de usuário

---

# Testes

## Cenários de Teste

### 1. Seed idempotente
```bash
# Rodar seed múltiplas vezes sem erro
npm run db:seed
npm run db:seed
npm run db:seed
# Deve funcionar sem erros
```

### 2. Sign-up normal
```
1. Acessar /sign-up
2. Criar conta com email qualquer
3. Verificar que User.role = 'user'
```

### 3. Sign-up com OWNER_EMAIL
```
1. Configurar OWNER_EMAIL=teste@teste.com no .env
2. Reiniciar servidor
3. Criar conta com email teste@teste.com
4. Verificar que User.role = 'owner'
```

### 4. Planos de billing existem
```sql
SELECT * FROM plans;
-- Deve retornar: Free, Starter, Pro, Business
```

---

# Riscos e Mitigações

## Risk: Hook do Better Auth não funciona
- **Mitigação**: Implementar verificação no middleware de autenticação
- **Mitigação**: Criar endpoint admin para definir owner manualmente

## Risk: OWNER_EMAIL não configurado
- **Mitigação**: Sistema funciona normalmente, apenas sem owner definido
- **Mitigação**: Log de warning se OWNER_EMAIL não está configurado

## Risk: Múltiplos owners
- **Mitigação**: OWNER_EMAIL aceita apenas um email
- **Mitigação**: Para múltiplos admins, usar role 'admin' separadamente

---

# Checklist de Implementação

- [ ] Simplificar `prisma/seeds/index.ts`
- [ ] Deletar `prisma/seeds/seed-users.ts`
- [ ] Deletar `prisma/seeds/seed-organization.ts`
- [ ] Deletar `prisma/seeds/seed-meta-ads.ts` (se existir)
- [ ] Atualizar `prisma/seeds/seed-billing.ts` (remover cleanBillingData)
- [ ] Adicionar `OWNER_EMAIL` ao `.env.example`
- [ ] Adicionar `OWNER_EMAIL` ao `.env` local
- [ ] Implementar hook no Better Auth
- [ ] Testar seed idempotente
- [ ] Testar sign-up normal
- [ ] Testar sign-up com OWNER_EMAIL
- [ ] Atualizar documentação

---

# Appendix

## Estrutura Final de Seeds

```
prisma/
├── seed.ts                    # Entry point (sem alteração)
└── seeds/
    ├── index.ts               # Simplificado (só billing)
    └── seed-billing.ts        # Planos e preços (idempotente)
```

## Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| OWNER_EMAIL | Email do dono do SaaS | tjgontijo@gmail.com |

## Roles de Usuário

| Role | Descrição | Como é definido |
|------|-----------|-----------------|
| owner | Dono do SaaS, acesso total | OWNER_EMAIL no .env |
| admin | Administrador do sistema | Definido manualmente |
| user | Usuário comum | Default para todos |

## Diferença entre User.role e Member.role

| Campo | Escopo | Valores | Propósito |
|-------|--------|---------|-----------|
| User.role | Global (SaaS) | owner, admin, user | Permissões no sistema como um todo |
| Member.role | Organization | owner, admin, member | Permissões dentro de uma organização específica |

**Exemplo:**
- Thiago tem `User.role = 'owner'` (dono do SaaS)
- Thiago é `Member.role = 'owner'` na organização "WhaTrack"
- João tem `User.role = 'user'` (usuário comum)
- João é `Member.role = 'admin'` na organização "Clínica Bella"
