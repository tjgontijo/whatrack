# WhatsApp Regression Commit Trace

## Objetivo

Este documento registra os commits relevantes para isolar quando a regressão do onboarding/coexistência do WhatsApp entrou.

Base de teste inicial:

- `cca4a08` `feat: finalize rbac, onboarding identity flow, and integration access UX`

Observação:

- A hipótese inicial de que a quebra começou em 13 de março estava incompleta.
- Há um bloco anterior, entre 22 e 23 de fevereiro de 2026, com mudanças fortes de design, guardrails, segurança, extração de lógica de routes para services/server e rotação de criptografia.
- Esse bloco é hoje o principal suspeito estrutural.

## Bloco anterior a 13 de março

### 0.1 `087fdcc` - 2026-02-22 15:46:30 -0300

Mensagem:

- `refactor: apply whatrack premium visual design to CRM data tables and kanban`

Leitura prática:

- Grande refactor visual do dashboard.
- Mais focado em UI de tabelas/kanban do que em onboarding, mas entra no pacote de redesign forte que você mencionou.

Risco para o bug:

- Médio.

### 0.2 `5c1923d` - 2026-02-22 15:56:48 -0300

Mensagem:

- `feat: apply premium structural layouts to configuration and settings pages`

Arquivos relevantes:

- páginas de `settings`
- estrutura visual de configuração

Leitura prática:

- Este é um suspeito importante do ponto de vista de layout/estrutura, porque mexe justamente em páginas de configuração.
- Pode ter alterado fluxo de navegação, containers, shells e montagem das telas de integração.

Risco para o bug:

- Alto.

### 0.3 `ebfdbe1` - 2026-02-23 10:33:11 -0300

Mensagem:

- `security: harden env vars, OAuth CSRF, rate limiting and auth guards before MVP`

Arquivos relevantes:

- `src/app/api/v1/whatsapp/onboarding/route.ts`
- `src/app/api/v1/whatsapp/webhook/route.ts`
- `src/services/whatsapp/meta-cloud.service.ts`
- `src/server/auth/validate-organization-access.ts`

Leitura prática:

- Este commit mexe diretamente em OAuth, CSRF, guards e no onboarding do WhatsApp.
- Se a regressão estiver ligada a callback, state, redirect, autorização ou bloqueio de request, este é um dos primeiros grandes suspeitos.

Risco para o bug:

- Muito alto.

### 0.4 `ad56266` - 2026-02-23 10:55:39 -0300

Mensagem:

- `refactor: implement post-MVP tech debt items T-03 through T-12`

Arquivos relevantes:

- múltiplas routes
- `src/lib/api-response.ts`
- `src/services/whatsapp/handlers/message.handler.ts`

Leitura prática:

- É exatamente o tipo de commit que combina com o que você descreveu: routes com responsabilidade sendo limpas e redistribuídas.
- Embora não toque diretamente o callback do onboarding, altera bastante a arquitetura das rotas e a superfície de integração.

Risco para o bug:

- Alto.

### 0.5 `5566b7e` - 2026-02-23 11:02:17 -0300

Mensagem:

- `refactor(tickets): extract business logic to ticket.service.ts (T-01)`

Leitura prática:

- Não é focado em WhatsApp onboarding.
- Entra no pacote de extração de lógica para services, mas parece lateral para este bug específico.

Risco para o bug:

- Baixo.

### 0.6 `7874a8b` - 2026-02-23 11:20:30 -0300

Mensagem:

- `feat(security): implement encryption key rotation with version prefixes (T-06)`

Arquivos relevantes:

- `src/lib/encryption.ts`
- `prisma/scripts/re-encrypt-tokens.ts`

Leitura prática:

- Este commit é extremamente relevante para o bug atual observado de `Invalid OAuth access token - Cannot parse access token`.
- Introduz rotação de chave e prefixos de versão, exatamente o tipo de mudança que pode quebrar leitura de tokens salvos se storage e reader ficarem desalinhados.

Risco para o bug:

- Muito alto.

### 0.7 `e0b2d07` - 2026-02-23 11:55:39 -0300

Mensagem:

- `feat(audit): implement phase 1 - foundation (pino logger and ALS request context)`

Arquivos relevantes:

- `src/lib/logger.ts`
- `src/lib/request-context.ts`
- `src/proxy.ts`

Leitura prática:

- Mexe na base transversal de request context e logging.
- Menos provável como causa direta do onboarding, mas importante como mudança estrutural de runtime.

Risco para o bug:

- Médio.

### 0.8 `fe60613` - 2026-02-23 13:24:45 -0300

Mensagem:

- `feat: disable initial onboarding flow and harden org bootstrap`

Arquivos relevantes:

- `src/app/(auth)/onboarding/page.tsx`
- `src/components/onboarding/onboarding-overlay.tsx`
- `src/app/dashboard/layout.tsx`

Leitura prática:

- Toca o conceito de onboarding e bootstrap inicial da organização.
- Pode ter alterado gating/overlay/estado de entrada do fluxo de integrações.

Risco para o bug:

- Médio a alto.

### 0.9 `b3239f3` - 2026-02-23 18:36:58 -0300

Mensagem:

- `refactor: padroniza CRUD e renomeia domínio product para item`

Leitura prática:

- Refactor estrutural amplo, mas sem foco claro em WhatsApp onboarding.
- Pode gerar ruído, porém parece menos provável como causa principal desta regressão.

Risco para o bug:

- Baixo a médio.

## Linha do tempo

### 1. `cca4a08` - 2026-02-25 11:40:40 -0300

Mensagem:

- `feat: finalize rbac, onboarding identity flow, and integration access UX`

Leitura prática:

- Este é o ponto de referência que estamos testando como "última versão conhecida boa" para a investigação.

### 2. `5094214` - 2026-03-13 15:29:58 -0300

Mensagem:

- `fix(prisma): apply billing migration and update imports to generated client`

Leitura prática:

- Mudança de Prisma e imports do client gerado.
- Não aparenta alterar diretamente popup, callback, coexistência ou fluxo de onboarding do WhatsApp.

Risco para o bug:

- Baixo para a regressão específica do onboarding.

### 3. `e2db4f7` - 2026-03-13 16:58:35 -0300

Mensagem:

- `fix(integrations): reorganize sidebar menu and fix OAuth redirect URIs`

Arquivos relevantes:

- `src/app/api/v1/meta-ads/callback/route.ts`
- `src/app/api/v1/meta-ads/connect/route.ts`
- `src/app/api/v1/whatsapp/onboarding/callback/route.ts`
- `src/app/api/v1/whatsapp/onboarding/route.ts`
- `src/components/dashboard/sidebar/sidebar-client.tsx`
- `src/services/whatsapp/whatsapp-onboarding.service.ts`

Leitura prática:

- Primeiro commit fortemente suspeito.
- Mexe em redirect URIs e no onboarding/callback do WhatsApp.
- Também coincide com a reorganização da navegação/sidebar mencionada como marco do problema.

Risco para o bug:

- Alto.

### 4. `02c5dca` - 2026-03-13 17:46:12 -0300

Mensagem:

- `fix(integrations): restore postMessage communication and automatic popup closing for WhatsApp and Meta Ads onboarding`

Arquivos relevantes:

- `src/app/api/v1/whatsapp/onboarding/callback/route.ts`
- `src/hooks/meta-ads/use-meta-ads-onboarding.ts`
- `src/hooks/whatsapp/use-whatsapp-onboarding.ts`

Leitura prática:

- Mexe diretamente no handshake entre popup e janela principal.
- Se `e2db4f7` introduziu quebra de redirect/opener, este commit foi uma tentativa de remediar isso.

Risco para o bug:

- Alto.

### 5. `bc7071b` - 2026-03-13 17:53:47 -0300

Mensagem:

- `fix(whatsapp): restore SDK coexistence with original claim-waba and check-connection endpoints`

Arquivos relevantes:

- `src/app/api/v1/whatsapp/check-connection/route.ts`
- `src/app/api/v1/whatsapp/claim-waba/route.ts`
- `src/hooks/whatsapp/use-whatsapp-onboarding.ts`

Leitura prática:

- Reintroduz o fluxo baseado em `claim-waba` e `check-connection`.
- Sinal claro de que o caminho principal já estava quebrado e precisou de remendo.

Risco para o bug:

- Alto.

### 6. `9d27ec2` - 2026-03-13 18:01:37 -0300

Mensagem:

- `Refactor: move settings menu to main sidebar and cleanup dashboard layout`

Arquivos relevantes:

- `src/app/dashboard/settings/layout.tsx`
- `src/components/dashboard/sidebar/sidebar-client.tsx`

Leitura prática:

- Mudança estrutural de layout e navegação.
- Toca pouco no fluxo de onboarding em si, mas pode ter alterado o local/rota onde a UI de integrações passou a viver.

Risco para o bug:

- Médio.

### 7. `da52da8` - 2026-03-13 18:14:07 -0300

Mensagem:

- `fix(whatsapp): ensure coexistence and fix build errors in reorganized settings`

Arquivos relevantes:

- `src/app/api/v1/whatsapp/claim-waba/route.ts`
- `src/app/dashboard/settings/whatsapp/page.tsx`
- `src/components/dashboard/integrations/integrations-hub.tsx`
- `src/hooks/whatsapp/use-whatsapp-onboarding.ts`
- `src/services/whatsapp/meta-cloud.service.ts`

Leitura prática:

- Novo ajuste direto em coexistência após a reorganização.
- Muito relevante para o bug, porque toca exatamente a tela e o hook do onboarding.

Risco para o bug:

- Alto.

### 8. `e799026` - 2026-03-13 18:30:53 -0300

Mensagem:

- `refactor(integrations): share dashboard shell components`

Arquivos relevantes:

- `src/app/dashboard/settings/integrations/page.tsx`
- `src/components/dashboard/integrations/integrations-hub.tsx`
- `src/components/dashboard/whatsapp/settings/whatsapp-settings-page.tsx`

Leitura prática:

- Refactor visual/estrutural do hub de integrações.
- Pode afetar montagem da tela, mas é menos central do que os commits que alteram hook/callback.

Risco para o bug:

- Médio.

### 9. `9d49bad` - 2026-03-13 19:07:43 -0300

Mensagem:

- `fix(whatsapp): restore hosted embedded signup coexistence`

Arquivos relevantes:

- `src/app/api/v1/whatsapp/onboarding/callback/route.ts`
- `src/app/dashboard/settings/whatsapp/page.tsx`
- `src/hooks/whatsapp/use-whatsapp-onboarding.ts`
- `src/lib/whatsapp/onboarding.ts`
- `src/services/whatsapp/whatsapp-onboarding.service.ts`

Leitura prática:

- Tenta restaurar o hosted embedded signup.
- É uma resposta corretiva, não o provável ponto inicial da quebra.

Risco para o bug:

- Médio como causa inicial, alto como mudança de comportamento.

### 10. `9de2a70` - 2026-03-13 19:42:53 -0300

Mensagem:

- `fix(whatsapp): restore pre-cca4a08 onboarding oauth contract`

Arquivos relevantes:

- `src/services/whatsapp/meta-cloud.service.ts`
- `src/services/whatsapp/whatsapp-onboarding.service.ts`

Leitura prática:

- Ajuste posterior tentando voltar ao contrato OAuth anterior.
- Também é corretivo, não o ponto mais provável onde a regressão nasceu.

Risco para o bug:

- Médio.

### 11. `e45c068` - 2026-03-13 19:54:21 -0300

Mensagem:

- `fix(whatsapp): harden onboarding callback fallback`

Arquivos relevantes:

- `src/app/api/v1/whatsapp/onboarding/callback/route.ts`
- `src/hooks/whatsapp/use-whatsapp-onboarding.ts`
- `src/lib/whatsapp/onboarding.ts`

Leitura prática:

- Endurece fallback de callback e comunicação com popup.
- Mais uma tentativa corretiva.

Risco para o bug:

- Médio.

### 12. `801db20` - 2026-03-13 20:12:48 -0300

Mensagem:

- `fix(whatsapp): materialize pending instances after onboarding`

Arquivos relevantes:

- `src/services/whatsapp/whatsapp-config.service.ts`
- `src/services/whatsapp/whatsapp-onboarding.service.ts`

Leitura prática:

- Corrige a materialização da instância após o onboarding.
- Atua no sintoma "conectou mas não apareceu", não no gatilho inicial da regressão.

Risco para o bug:

- Baixo como causa inicial.

## Recomendação de ordem de teste

Se a estratégia for avançar commit a commit a partir de `cca4a08`, a ordem recomendada é:

1. `cca4a08`
2. `5094214`
3. `e2db4f7`
4. `02c5dca`
5. `bc7071b`
6. `9d27ec2`
7. `da52da8`

Se o objetivo for testar o pacote anterior que você descreveu, a ordem mais útil é:

1. um ponto antes de `5c1923d`
2. `5c1923d`
3. `ebfdbe1`
4. `ad56266`
5. `7874a8b`
6. `e0b2d07`
7. `fe60613`
8. `cca4a08`

Se o objetivo for otimizar o diagnóstico e pular commits menos prováveis, a ordem recomendada é:

1. `cca4a08`
2. `7874a8b`
3. `ebfdbe1`
4. `ad56266`
5. `5c1923d`
6. `fe60613`
7. `e2db4f7`

## Hipótese atual mais forte

Com base no histórico e nos logs:

- a regressão principal pode ter entrado antes de 13 de março, no bloco de 22-23 de fevereiro
- `7874a8b` é hoje o suspeito mais forte para o bug de token salvo/lido
- `ebfdbe1` é um suspeito muito forte para qualquer quebra de OAuth/callback/state/guards
- `5c1923d` e `fe60613` são suspeitos fortes para efeitos colaterais de layout/onboarding/bootstrap
- os commits de 13 de março parecem mais uma sequência de reorganização e tentativas de correção sobre uma base que talvez já estivesse fragilizada

## Notas operacionais

- O problema atual observado em produção para `cca4a08` é diferente do popup: o onboarding conclui, mas a leitura da instância falha ao reler o token salvo no banco.
- Esse bug de token salvo/lido não invalida a estratégia de bisect manual; ele só precisa ser separado da regressão original de coexistência/layout.
- Se a investigação seguir pelo caminho do token, o commit `7874a8b` merece prioridade máxima.
