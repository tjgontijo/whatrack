# PRD: Onboarding Dialog — Criação de Organização

**Status:** Aprovado para implementação
**Data:** 2026-03-01

---

## Contexto

Após sign-up, o usuário cai no `/dashboard` sem organização. O fluxo atual usa um badge `⚠️` no header como único gatilho — fácil de ignorar, sem orientação, UX inconsistente entre desktop/mobile.

## Objetivo

Substituir por um Dialog modal bloqueante, estilo quiz, que abre automaticamente no primeiro acesso. Simples, linear, 2 passos.

---

## Fluxo

```
Sign-up → /dashboard
              ↓
   [Layout detecta: sem org ou identidade incompleta]
              ↓
   OnboardingDialog abre automaticamente (bloqueante)
              ↓
   PASSO 1: "Como você opera?"
   ┌──────────────────┐  ┌──────────────────┐
   │  👤 Pessoa Física │  │  🏢 Empresa       │
   │  (CPF)            │  │  (CNPJ)           │
   └──────────────────┘  └──────────────────┘
              ↓
   PASSO 2A (PF):              PASSO 2B (PJ):
   Campo "Nome completo"       Campo CNPJ com máscara
   (pré-preenchido do          Busca automática ao
   cadastro, editável)         digitar o 14º dígito
   Campo CPF com máscara       Card preview dos dados
                               da Receita Federal
              ↓
   Botão "Criar minha conta" → POST /api/v1/organizations
              ↓
   setActive → invalidate queries → dialog fecha
```

---

## Requisitos Funcionais

### RF-01 — Trigger automático
- Dialog abre se `!hasOrganization` (sem org criada).
- Verificação já existe em `DashboardLayout` via `hasOrganization` prop.
- Não abre se usuário entrou via convite e já tem org (mesmo sem identidade — o badge existente cobre esse caso).

### RF-02 — Dialog não-dispensável
```tsx
onInteractOutside={(e) => e.preventDefault()}
onEscapeKeyDown={(e) => e.preventDefault()}
// Sem botão X de fechar
```

### RF-03 — Passo 1: Seleção de tipo (PF vs PJ)
- Dois cards grandes clicáveis, lado a lado.
- **PF**: ícone `UserRound`, label "Pessoa Física", sublabel "Autônomo ou profissional liberal".
- **PJ**: ícone `Building2`, label "Empresa", sublabel "CNPJ ativo na Receita Federal".
- Click seleciona e avança para passo 2 sem botão de confirmação.

### RF-04 — Passo 2A (Pessoa Física)
- **Campo "Nome completo"**: pré-preenchido com `session.user.name`, editável, obrigatório (mínimo 3 chars). Este será o nome da organização.
- **Campo CPF**: máscara `000.000.000-00`, validação de checksum local via `validateCpf()`.
- Botão "Criar minha conta" habilitado somente com nome válido + CPF válido.
- Submit: `POST /api/v1/organizations` com `{ entityType: 'individual', documentNumber }`.
  - `organizationName` deriva do nome confirmado (backend usa `user.name` — se necessário, atualizar `user.name` antes ou passar no payload).

### RF-05 — Passo 2B (Pessoa Jurídica)
- **Campo CNPJ**: máscara `00.000.000/0000-00`.
- **Busca automática**: dispara `GET /api/v1/company/lookup?cnpj=...` quando `normalizedCnpj.length === 14`.
- Estado loading: spinner inline no campo, não bloqueia digitação.
- Estado success: card preview com `razaoSocial`, `nomeFantasia` (se houver), `municipio/UF`, `situacao`.
- Estado error: mensagem inline abaixo do campo (não toast).
- Botão "Criar minha conta" habilitado somente após lookup bem-sucedido.
- Submit: `POST /api/v1/organizations` com `{ entityType: 'company', documentNumber, companyLookupData }`.

### RF-06 — Pós-submit
```ts
await authClient.organization.setActive({ organizationId: body.id })
await queryClient.invalidateQueries(['organizations', 'me', 'completion'])
await queryClient.invalidateQueries(['organizations', 'me'])
await queryClient.invalidateQueries(['organizations', 'me', 'authorization'])
router.refresh()
// dialog fecha
```

### RF-07 — Botão "Voltar" no passo 2
- Volta para o passo 1, reseta campos do passo 2.

### RF-08 — Badge ⚠️ no header
- `OrganizationStatusBadge` não exibe quando `!hasOrganization` (dialog cobre esse caso).
- Continua exibindo quando `hasOrganization && !identityComplete` (usuários convidados sem documento).

---

## Decisão: Slug da Organização

**Slug gerado como derivado do ID**, não do nome. Motivo: slug baseado em nome causa colisões, fica desatualizado se o nome mudar, e gera sufixos aleatórios feios (ex: `minha-empresa-k3f9x2`). O `better-auth` exige o campo mas nunca é exposto ao usuário — deve ser opaco.

**Implementação**: `generateUniqueSlug` passa a gerar `cuid2` ou os primeiros 12 chars do `id` da org recém-criada, sem relação com o nome.

## O que NÃO muda

- `POST /api/v1/organizations` — sem alteração de contrato.
- `GET /api/v1/company/lookup` — sem alteração.
- Schemas Zod de onboarding — sem alteração.
- `OrganizationIdentityDrawer` — continua para edição de identidade existente.

## O que MUDA além do dialog

- `generateUniqueSlug` em `organization-management.service.ts` — gerar slug baseado em ID, não nome.

---

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/dashboard/organization/onboarding-dialog.tsx` | CRIAR |
| `src/app/dashboard/layout.tsx` | EDITAR — renderizar `<OnboardingDialog>` |
| `src/components/dashboard/organization/organization-status-badge.tsx` | EDITAR — não exibir se `!hasOrganization` |

---

## UX Notes

- Overlay escurecido com backdrop blur leve.
- Largura do dialog: `max-w-md` (400px), centered.
- Animação de transição entre passos: slide horizontal (`translateX`).
- Passo 1 não tem botão — click no card já avança.
- Passo 2: botão primário "Criar minha conta" + link/ghost "Voltar".
- Indicador de progresso: dois dots ou `1 / 2` no topo do dialog.
- Tom de voz: direto, sem jargão técnico ("Criar minha conta", não "Concluir onboarding").
