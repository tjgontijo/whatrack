# PRD: Trabalho Restante para Lancamento da V1 - WhaTrack

**Status**: Open
**Target Release**: V1 Launch
**Owner**: Product + Engineering
**Updated**: 2026-03-08
**Referencia**: `docs/PRD/PRD_V1_LAUNCH.md`

---

## 1. Executive Summary

Este documento descreve apenas o que **ainda falta fazer** para o lancamento da V1.

O produto avancou o suficiente para sair da fase de "falta de definicao" e entrar na fase de "fechamento de launch". Billing, funil principal e hardening inicial ja evoluiram, mas ainda existem bloqueios reais de go-live em seguranca de rotas internas, alinhamento operacional de billing e validacao manual ponta a ponta.

O objetivo agora nao e abrir escopo. O objetivo e fechar o minimo necessario para um launch pago com risco controlado.

---

## 2. O Que Ja Foi Fechado

Os seguintes blocos ja avancaram e **nao sao mais a frente principal deste PRD**:

- funil principal de billing com self-serve focado em Starter e Pro;
- preservacao de `next` no auth e melhoria do retorno do checkout;
- centralizacao de partes do catalogo de planos;
- endurecimento inicial do `proxy`;
- bloqueio de prefixos internos no `proxy` em producao;
- limpeza de logs sensiveis do webhook de billing;
- baseline inicial de headers de seguranca no app;
- retirada de IA da promessa comercial da V1.

Este PRD trata apenas do delta restante.

---

## 3. Problema Restante

Hoje o produto esta em estado de **quase launch**, mas ainda nao em estado de **go-live**.

Os bloqueios atuais sao:

- ainda existem rotas operacionais ou internas sem guarda server-side explicita;
- a documentacao operacional de billing continua parcialmente desalinhada com os eventos reais aceitos pelo sistema;
- falta smoke manual registrado dos fluxos criticos;
- falta um checklist unico e confiavel de release;
- ainda ha melhorias importantes de seguranca que podem ficar para logo apos o launch, mas precisam estar explicitamente classificadas como pos-launch.

---

## 4. Objetivo Deste PRD

Levar o produto de "quase pronto" para "pronto para abrir cobranca e receber os primeiros clientes pagantes".

Este PRD sera considerado concluido quando:

- nao houver endpoint interno sensivel exposto sem guarda adequada;
- billing code, docs e setup operacional estiverem alinhados;
- os fluxos manuais de launch tiverem sido executados e registrados;
- existir uma decisao objetiva de go/no-go baseada em checklist.

---

## 5. Escopo Restante Obrigatorio

### 5.1 Frente 1: Hardening Final de Rotas e Endpoints Internos

#### Problema

O `proxy` ja foi endurecido, mas ele continua sendo apenas camada auxiliar. O launch ainda depende de fechar a protecao server-side nas rotas que nao deveriam ficar abertas por engano.

#### Requisitos

- remover do launch publico ou proteger explicitamente:
  - `/api/v1/test/publish-message`
  - `/api/v1/health/redis`
  - `GET /api/v1/whatsapp/history-sync-alerts`
- revisar outras rotas operacionais para confirmar se sao:
  - publicas de verdade;
  - protegidas por token/secret;
  - protegidas por sessao/permissao;
  - ou fora do escopo do launch.
- garantir que toda rota sensivel tenha validacao server-side propria.

#### Criterios de Aceite

- nenhuma rota de teste, health ou operacao interna responde sem controle apropriado;
- o `proxy` nao e a unica barreira de seguranca;
- existe uma classificacao objetiva das rotas em `public`, `authenticated`, `secret-protected` e `internal-only`.

### 5.2 Frente 2: Alinhamento Final de Billing e Operacao

#### Problema

O codigo de webhook de billing ja esta mais seguro, mas a documentacao do projeto ainda fala em eventos e contratos que nao refletem exatamente o comportamento atual.

#### Requisitos

- alinhar `docs/BILLING_DEPLOYMENT.md` com os eventos reais hoje suportados;
- alinhar `docs/PRD/ABACATEPAY_WEBHOOK_SETUP.md` e checklists relacionados;
- remover orientacoes antigas que ainda mandam assinar:
  - `subscription.created`
  - `subscription.updated`
  - `subscription.canceled`
- consolidar um unico checklist de setup para:
  - URL do webhook
  - segredo do webhook
  - eventos reais suportados
  - fluxo de teste manual

#### Criterios de Aceite

- documentacao interna nao contradiz o handler real;
- qualquer pessoa do time consegue configurar billing sem adivinhacao;
- existe um unico fluxo de verificacao para webhook em staging/producao.

### 5.3 Frente 3: Smoke Manual de Launch

#### Problema

Sem smoke manual registrado, ainda existe risco de launch com funil quebrado mesmo com build e testes verdes.

#### Requisitos

- executar e registrar o fluxo:
  - landing
  - sign-up ou sign-in
  - onboarding de organizacao
  - checkout
  - webhook recebido
  - assinatura ativa no dashboard
  - cancelamento refletido no sistema
- executar ao menos um caminho feliz de:
  - conexao WhatsApp
  - conexao Meta Ads
- registrar erros, screenshots ou observacoes quando houver.

#### Criterios de Aceite

- existe uma evidencia clara de que o primeiro cliente consegue ativar o produto;
- qualquer falha encontrada vira item objetivo de correcao, nao observacao vaga;
- o smoke e repetivel por qualquer pessoa do time.

### 5.4 Frente 4: Release Checklist e Decisao de Go/No-Go

#### Problema

Hoje ainda nao existe um gate final simples o suficiente para decidir se pode lancar sem discussao difusa.

#### Requisitos

- consolidar checklist final de release;
- incluir:
  - env vars obrigatorias
  - webhook ativo
  - cron/jobs ativos
  - smoke executado
  - `lint`, `tests` e `build` verdes
  - paginas publicas e CTA principais validados
- formalizar a decisao final como:
  - `go`
  - `go with known risks`
  - `no-go`

#### Criterios de Aceite

- existe um documento unico para decisao de release;
- a decisao de launch pode ser tomada em menos de 15 minutos com base em evidencias.

---

## 6. Escopo Pos-Launch

Os itens abaixo sao importantes, mas **nao precisam bloquear a V1** se o escopo obrigatorio acima estiver fechado:

- verificacao de e-mail obrigatoria ou gating por acoes sensiveis;
- CSP mais estrita com nonce/hash e politicas mais fortes de frontend;
- cleanup adicional de docs historicas antigas de billing;
- revisao ampla de observabilidade e classificacao de logs;
- automacoes e fluxos ligados a IA.

---

## 7. Prioridade de Execucao

### P0 - Bloqueadores de Launch

- hardening final de rotas internas e operacionais;
- alinhamento de docs e setup de billing;
- smoke manual completo de aquisicao e ativacao;
- checklist final de release.

### P1 - Alto Valor, Pode Entrar Antes ou Logo Depois do Go-Live

- gating de e-mail verificado para acoes sensiveis;
- reforco adicional de CSP e politica de browser security;
- limpeza de documentacao antiga que ainda confunde setup.

### P2 - Pos-Launch

- melhorias de observabilidade alem do minimo operacional;
- refactors de cleanup fora do caminho critico de launch.

---

## 8. Plano de Execucao Recomendado

### Fase 1

Objetivo: fechar superficie exposta.

Entregas:

- proteger/remover endpoints internos restantes;
- classificar endpoints operacionais por tipo de acesso;
- validar comportamento em producao/staging.

### Fase 2

Objetivo: fechar billing operacional.

Entregas:

- alinhar docs de webhook;
- consolidar checklist unico da AbacatePay;
- validar configuracao real do webhook.

### Fase 3

Objetivo: provar launch na pratica.

Entregas:

- rodar smoke manual ponta a ponta;
- rodar smoke manual de WhatsApp e Meta Ads;
- registrar evidencias e pendencias.

### Fase 4

Objetivo: decidir go/no-go.

Entregas:

- checklist final preenchido;
- riscos conhecidos documentados;
- decisao final de release.

---

## 9. Dependencias

- acesso ao ambiente de staging ou producao controlada;
- credenciais reais de AbacatePay, Meta, Redis, Centrifugo e Resend;
- alguem do time com contexto para executar smoke comercial e tecnico;
- confirmacao de quais rotas operacionais devem continuar expostas via token.

---

## 10. Riscos se Nada For Feito

- launch com endpoint interno ainda exposto;
- onboarding ou billing quebrando no primeiro cliente real;
- configuracao incorreta de webhook por documentacao ambigua;
- decisao de release baseada em percepcao e nao em evidencia;
- atraso adicional por reabertura de escopo em vez de fechamento.

---

## 11. Definicao de Pronto

O launch da V1 sera considerado pronto quando:

- P0 estiver completo;
- nenhum bloqueador restante estiver aberto;
- smoke manual principal estiver registrado;
- houver decisao explicita de `go` ou `go with known risks`.
