# PRD: Finalizacao da V1 e Plano de Lancamento - WhaTrack

**Status**: Proposed
**Target Release**: V1 Launch
**Owner**: Product + Engineering
**Updated**: 2026-03-07

---

## 1. Executive Summary

O WhaTrack ja tem superficie suficiente para ser lancado como V1. O problema atual nao e falta de features, e sim falta de fechamento dos fluxos mais sensiveis: cobranca, continuidade do funil de compra, hardening minimo de autenticacao, alinhamento de copy com produto e configuracao operacional.

Este PRD define o **menor escopo necessario** para transformar a base atual em uma V1 lancavel, com monetizacao funcional, ativacao consistente e operacao minima segura.

Decisoes ja tomadas para esta V1:

- **sem IA no launch**;
- **cancelamento deve ser real no provedor**, sem "cancelamento fake" apenas no banco.

---

## 2. Problema a Resolver

Hoje o produto ja cobre:

- landing e paginas publicas;
- autenticacao e reset de senha;
- onboarding de organizacao PF/PJ;
- dashboard com modulos de leads, tickets, sales, analytics, WhatsApp e Meta Ads;
- billing com checkout, webhook, subscription, usage e cancelamento;
- jobs operacionais e integracoes externas.

Mesmo com essa cobertura, a V1 ainda nao esta pronta para lancamento pago porque os fluxos criticos estao incompletos ou desalinhados:

- billing ainda nao esta fechado ponta a ponta;
- acquisition funnel perde contexto entre pricing, auth e assinatura;
- copy, pricing e limites nao estao 100% consistentes;
- algumas rotas internas dependem de protecao insuficiente;
- operacao de webhooks/jobs ainda precisa de checklist e validacao final;
- a suite automatizada ainda nao esta totalmente verde.

---

## 3. Definicao da V1

### 3.1 In Scope

A V1 deve incluir apenas o necessario para entregar o valor central do produto:

- landing principal e paginas publicas de solucao;
- sign-up, sign-in, forgot password, reset password e fluxo de convite;
- onboarding de organizacao PF/PJ com selecao de organizacao ativa;
- billing self-serve para planos Starter e Pro;
- plano Agency somente como fluxo comercial;
- onboarding e operacao basica de WhatsApp;
- conexao e leitura basica de Meta Ads;
- dashboard principal com evidencias suficientes de valor;
- webhooks, cron jobs e observabilidade minima para operar em producao.

### 3.2 Out of Scope

Nao fazem parte do fechamento da V1:

- novas features de produto nao ligadas ao launch;
- portal completo de billing, invoice center e historico detalhado de faturas;
- upgrade/downgrade automatizado entre planos;
- refactors amplos fora das areas criticas;
- qualquer fluxo de IA, classificacao automatica, copilots e automacoes baseadas em IA;
- paginas internas nao essenciais para aquisicao, ativacao ou retencao inicial.

---

## 4. Proposta de Valor da V1

A promessa da V1 deve ser objetiva:

> Conectar WhatsApp e Meta Ads para rastrear melhor a origem dos leads e vendas, com visibilidade operacional em dashboard e cobranca recorrente funcionando de forma confiavel.

A V1 nao deve vender mais do que consegue provar na pratica.

A copy da V1 deve evitar promessas de IA, classificacao automatica ou automacoes avancadas.

---

## 5. Estado Atual do Produto

### 5.1 Sinais Positivos

- `npm run lint` passa.
- `npm run build` passa.
- o produto ja possui telas, APIs e servicos para os principais dominios.
- billing, WhatsApp, Meta Ads, organizacoes e dashboard ja existem no codebase.
- ha cobertura de testes em organizacoes, AI, leads, sales, tickets, Meta Ads e parte de WhatsApp.

### 5.2 Gaps Reais Antes do Lancamento

- billing ainda tem risco funcional e de confianca;
- checkout e auth nao preservam o contexto de compra de forma consistente;
- pricing e limites ainda nao estao centralizados em uma unica fonte de verdade;
- docs de billing e implementacao nao estao totalmente alinhadas;
- ha rotas internas que precisam de guarda explicita;
- existe ao menos um teste falhando;
- jobs externos e integracoes de producao precisam de checklist unico.

---

## 6. Objetivos da V1

### 6.1 Objetivos de Negocio

- permitir que o primeiro cliente pagante consiga comprar e ativar o produto sem intervencao manual;
- entregar uma jornada simples de aquisicao -> cadastro -> onboarding -> assinatura -> uso;
- reduzir risco de cobranca incorreta ou experiencia quebrada no primeiro contato pago;
- lancar com um escopo honesto e defensavel.

### 6.2 Objetivos Tecnicos

- deixar billing correto ponta a ponta;
- garantir continuidade do funil de compra;
- deixar as rotas internas criticas explicitamente protegidas;
- zerar falhas conhecidas no caminho de launch;
- consolidar checklist operacional de producao.

### 6.3 Non-Goals

- maximizar escopo;
- introduzir novas promessas comerciais sem validacao;
- refatorar arquitetura alem do necessario para fechar a V1.

---

## 7. Metricas de Sucesso

O projeto sera considerado pronto para lancamento quando atingir os seguintes criterios:

- 1 usuario novo consegue sair da landing e concluir assinatura Starter/Pro sem bloqueios.
- 1 usuario novo consegue concluir onboarding de organizacao e entrar no dashboard com organizacao ativa.
- checkout, webhook e ativacao de assinatura funcionam ponta a ponta em ambiente real ou staging equivalente.
- cancelamento da assinatura cancela de fato no provedor e reflete corretamente no sistema.
- pricing exibido na landing, dashboard e metering usa a mesma regra.
- nenhuma rota interna de teste/health fica exposta sem controle apropriado.
- suite automatizada de launch-critical flows fica verde.
- checklist operacional de env, webhooks e jobs e executado antes do go-live.

---

## 8. Requisitos Funcionais por Frente

### 8.1 Billing e Monetizacao

#### Requisitos

- centralizar planos, limites, precos e overage em uma unica fonte de verdade;
- corrigir URLs de `success` e `return` do checkout;
- preservar destino pretendido quando o usuario entra via CTA de pricing;
- alinhar handler, docs e configuracao real de webhooks;
- implementar cancelamento real no provider;
- para cobrancas `MULTIPLE_PAYMENTS`, tratar cancelamento como encerramento da renovacao futura no provider;
- manter `status` de lifecycle da assinatura no sistema (`active`, `paused`, `canceled`, `past_due`);
- usar boolean de renovacao na model como fonte de verdade para "vai renovar ou nao";
- aproveitar o campo ja existente `canceledAtPeriodEnd` ou substitui-lo explicitamente por `autoRenew`, mas sem reduzir a assinatura a apenas um boolean;
- atualizar o guia operacional de billing para documentar claramente o fluxo oficial de cancelamento recorrente adotado;
- adicionar testes automatizados minimos para billing.

#### Criterios de aceite

- o usuario consegue comprar Starter e Pro;
- o dashboard mostra assinatura ativa apos webhook;
- o usuario consegue cancelar e a cobranca recorrente deixa de renovar no provider;
- o sistema reflete corretamente `status` e o flag de renovacao da assinatura;
- docs e codigo usam o mesmo contrato de webhook;
- nao existe divergencia de limites/precos entre marketing, dashboard e backend.

### 8.2 Funil de Aquisicao e Ativacao

#### Requisitos

- landing CTA deve manter contexto de compra apos login ou cadastro;
- sign-in e sign-up devem respeitar `next` quando presente;
- onboarding PF/PJ deve terminar com organizacao ativa e dashboard funcional;
- pagina de sucesso do billing deve devolver o usuario para a area correta.

#### Criterios de aceite

- fluxo `landing -> auth -> billing` funciona sem desvio para telas erradas;
- onboarding termina sem o usuario precisar de suporte manual;
- nao existem links quebrados ou rotas inexistentes no fluxo de compra.

### 8.3 Core Product Value

#### Requisitos

- WhatsApp onboarding precisa funcionar no caminho feliz;
- Meta Ads precisa conectar e permitir leitura suficiente para demonstracao de valor;
- dashboard principal precisa apresentar dados coerentes para o caso de uso de lancamento.

#### Criterios de aceite

- ao menos 1 fluxo manual validado para WhatsApp onboarding;
- ao menos 1 fluxo manual validado para Meta Ads connection;
- dashboard mostra valor suficiente para justificar assinatura;
- nenhuma copy principal do launch depende de IA para ser verdadeira.

### 8.4 Autenticacao e Seguranca Minima

#### Requisitos

- rotas privadas precisam de guarda explicita, nao apenas protecao indireta via proxy;
- endpoints internos de teste, debug e health devem ser removidos do launch publico ou protegidos;
- proxy deve continuar servindo como camada auxiliar, nao como unica barreira.

#### Criterios de aceite

- nenhuma rota interna sensivel fica acessivel sem auth/guard adequada;
- endpoints de teste nao ficam expostos em producao;
- fluxo de sessao e organizacao ativa nao gera acesso inconsistente.

### 8.5 Operacao, Infra e Observabilidade

#### Requisitos

- consolidar checklist de variaveis de ambiente;
- validar credenciais reais de AbacatePay, Meta, Redis, Centrifugo e Resend;
- validar entrega de webhook de billing;
- validar jobs recorrentes;
- garantir logs minimos para billing webhook, WhatsApp webhook e jobs.

#### Criterios de aceite

- deploy de producao sobe com env completo;
- webhook de billing chega e processa;
- cron jobs necessarios estao ativos;
- time consegue diagnosticar falha sem depender de engenharia ad hoc.

### 8.6 Qualidade e Release Readiness

#### Requisitos

- deixar os checks de qualidade verdes;
- rodar smoke manual dos fluxos principais;
- documentar resultado e pendencias conhecidas.

#### Criterios de aceite

- `lint`, `tests` e `build` passam;
- smoke de launch e executado e registrado;
- ha decisao explicita de go/no-go.

---

## 9. Fases de Execucao

### Fase 0 - Freeze de Escopo e Copy

Objetivo: definir exatamente o que entra na V1 e cortar o resto.

Entregas:

- lista final de modulos que entram no launch;
- lista de modulos que ficam pos-launch;
- revisao de copy da landing e pricing para refletir a realidade;
- remocao de promessas de IA do escopo de launch.

### Fase 1 - Fechamento de Billing

Objetivo: eliminar o maior risco de receita e confianca.

Entregas:

- corrigir URLs e continuidade do checkout;
- unificar planos/precos/limites;
- alinhar docs de webhook com implementacao;
- implementar cancelamento real no provider;
- modelar cancelamento recorrente com `status` + boolean de renovacao;
- refletir o fluxo oficial de cancelamento da AbacatePay na documentacao interna;
- adicionar testes automatizados minimos de billing;
- executar E2E de billing em sandbox/producao controlada.

### Fase 2 - Fechamento de Ativacao

Objetivo: garantir que o usuario novo consiga chegar ao valor.

Entregas:

- preservar `next` no auth;
- validar onboarding PF/PJ;
- validar organizacao ativa apos onboarding;
- validar retorno para dashboard correto apos assinatura;
- smoke completo do fluxo de primeira ativacao.

### Fase 3 - Hardening de Seguranca e Operacao

Objetivo: reduzir risco de incidentes no go-live.

Entregas:

- proteger ou remover endpoints internos;
- revisar guards explicitos de rotas launch-critical;
- consolidar checklist de env;
- validar webhooks e jobs;
- remover qualquer dependencia operacional de IA do launch.

### Fase 4 - QA, Smoke e Go/No-Go

Objetivo: provar que a V1 esta pronta para publico.

Entregas:

- suite automatizada verde;
- smoke manual executado;
- lista curta de riscos aceitos;
- decisao final de lancamento.

---

## 10. Smoke Test Obrigatorio

Antes do lancamento, executar e registrar no minimo:

1. `landing -> sign-up -> onboarding PF -> dashboard`
2. `landing pricing -> sign-in/sign-up -> checkout -> success -> dashboard/billing`
3. `assinatura ativa -> usage carregando corretamente`
4. `cancelamento` com comportamento coerente com a politica definida
5. `Meta Ads connect -> retorno ao dashboard`
6. `WhatsApp onboarding -> retorno ao dashboard`
7. `webhook de billing` processado com sucesso
8. `jobs operacionais` respondendo com auth correta

---

## 11. Dependencias

- credenciais reais de AbacatePay;
- confirmacao do fluxo oficial de cancelamento recorrente na AbacatePay;
- webhook secret validado;
- Redis operacional;
- Centrifugo operacional;
- Resend operacional, se alertas/email fizerem parte da V1;
- atualizacao do guia interno da AbacatePay caso a documentacao local esteja incompleta.

---

## 12. Riscos

### Risco 1: Billing enganoso ou incompleto

Impacto: muito alto.

Se checkout, webhook, pricing ou cancelamento ficarem incoerentes, o produto perde confianca logo na primeira compra.

### Risco 2: Contrato do provedor nao cobrir cancelamento como esperado

Impacto: alto.

Se o fluxo oficial da AbacatePay nao expuser cancelamento recorrente da forma esperada, o billing da V1 precisa ser redesenhado antes do launch.

### Risco 3: Copy vender mais do que o produto entrega

Impacto: alto.

Se a landing prometer IA, tracking ou automacoes nao validadas, o primeiro cliente entra com expectativa errada.

### Risco 4: Exposicao de rotas internas

Impacto: alto.

Rotas internas de teste/health sem guarda adequada aumentam risco operacional e de seguranca.

### Risco 5: Dependencia operacional nao documentada

Impacto: medio/alto.

Se webhook, cron ou env nao estiverem claramente fechados, a V1 pode "parecer pronta" e quebrar depois do deploy.

---

## 13. Decisoes que Precisam Ser Tomadas Agora

1. Qual endpoint ou fluxo oficial da AbacatePay sera usado para cancelamento real?
2. O plano Agency fica apenas como captura comercial ou entra em qualquer fluxo self-serve?
3. Quais modulos do dashboard sao oficialmente suportados na V1?

Sem essas decisoes, a execucao tende a continuar abrindo escopo em vez de fechar a versao.

---

## 14. Definicao de Pronto para Lancar

A V1 esta pronta quando:

- billing estiver correto e honesto;
- cancelamento real estiver confirmado e implementado no provider;
- o funil de compra estiver continuo;
- pricing e copy estiverem consistentes;
- a copy nao depender de IA;
- rotas criticas estiverem protegidas;
- operacao minima estiver configurada;
- checks automatizados e smoke manual estiverem verdes;
- houver uma decisao formal de go-live.

Esse e o encerramento da V1. Qualquer item alem disso deve ser tratado como V1.1 ou V2.
