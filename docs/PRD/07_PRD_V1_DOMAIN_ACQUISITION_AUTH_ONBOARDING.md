# PRD V1 Domain: Acquisition, Auth and Onboarding

## Objetivo

Garantir que um usuário novo consiga sair da landing, criar conta, entrar, criar organização e chegar na área logada sem fricção crítica.

## Estado Implementado Hoje

Base já existente no código:

- landing pública com copy segmentada em `src/components/landing/types.ts`
- pricing da landing em `src/components/landing/LandingPricing.tsx`
- login em `src/app/(auth)/sign-in/page.tsx`
- cadastro em `src/app/(auth)/sign-up/page.tsx`
- layout autenticado em `src/app/dashboard/layout.tsx`
- onboarding de organização em `src/components/dashboard/organization/onboarding-dialog.tsx`
- criação de organização em `src/app/api/v1/organizations/route.ts`
- convites em `src/app/api/v1/invitations`

## Escopo Oficial da V1

Entra no launch:

- landing principal
- cadastro por e-mail
- login por e-mail
- preservação de `next` para retorno ao fluxo correto
- onboarding de organização PF/PJ
- seleção de organização ativa
- entrada no dashboard principal

Fica fora do esforço de hoje:

- redesign completo da landing
- refactor amplo de auth
- novos métodos de autenticação

## Gaps Reais

- ainda falta smoke manual ponta a ponta do fluxo público
- a promessa comercial da landing precisa continuar alinhada com IA assistida, não com autonomia total
- convites precisam ser revalidados só como fluxo suportado, não como frente principal de launch

## Tarefas de Hoje

1. Rodar smoke manual `landing -> cadastro -> login -> onboarding -> dashboard`.
2. Validar se todo redirect importante preserva o destino esperado.
3. Confirmar que a landing principal, CTA e pricing batem com o produto que será lançado amanhã.
4. Confirmar que um usuário novo cai em organização válida antes de acessar módulos internos.
5. Registrar qualquer quebra real como bug de launch, não como melhoria futura.

## Critérios de Aceite

- usuário novo cria conta sem erro bloqueante
- usuário novo cria organização e entra no dashboard
- redirects de auth não perdem o destino do fluxo
- não existe passo obrigatório sem UI clara
- copy pública não promete algo que a operação não sustenta amanhã

## Riscos de Launch

- fricção de onboarding derruba conversão rápido
- copy desalinhada com IA gera suporte e expectativa errada já no dia 1
