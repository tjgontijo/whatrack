# Quick Start: PRD-015

**Status:** Draft
**Data:** 2026-03-21

---

## Objetivo da Execução

Corrigir a inconsistência de autorização observada em `/settings/whatsapp` e estabelecer uma regra reutilizável para outras superfícies do dashboard:

- tenant/workspace usa permissões efetivas da organização;
- system/global usa `role` global;
- a UI não depende de sessão stale para decidir acesso de workspace.

---

## Decisão Recomendada

### Recomendado

Manter a tela de WhatsApp como superfície de workspace, mas dividir a área de `Webhook` em:
- blocos de setup operacional liberados por capability de integração;
- blocos owner-only para verify token e logs sistêmicos.

Isso preserva segurança, reduz ambiguidade e impede que a aba inteira dependa do estado momentâneo de `session.user.role`.

### Alternativa Menor

Manter a aba inteira owner-only e corrigir apenas o refresh de sessão após signup.

Trade-off:
- menor esforço;
- mas mantém a mistura entre página de workspace e recurso sistêmico;
- deixa o padrão vulnerável a reaparecer em outras telas.

---

## Ordem Sugerida

1. Implementar capabilities server-side para a página de WhatsApp.
2. Trocar o gating da aba e da view para props/capabilities.
3. Isolar as queries owner-only.
4. Corrigir o fluxo de sessão ligado a `OWNER_EMAIL`.
5. Rodar auditoria curta nos outros usos de `session.user.role`.

---

## Checklist de Aceitação

- Um usuário com acesso de workspace vê as partes corretas da tela sem relogar.
- Um usuário sem capability owner não chama endpoint owner-only.
- Um owner recém-criado por `OWNER_EMAIL` enxerga controles owner-only imediatamente, quando aplicável.
- UI e API compartilham a mesma policy para verify token e webhook logs.
- Existe pelo menos um teste cobrindo a visibilidade da aba `Webhook`.

---

## Riscos a Observar na Implementação

- Introduzir capabilities demais e duplicar a policy em vários lugares.
- Expor segredo global em superfície de workspace por simplificação indevida.
- Corrigir apenas o sintoma da aba e não a causa arquitetural.
- Resolver no cliente algo que já deveria vir decidido do servidor.
