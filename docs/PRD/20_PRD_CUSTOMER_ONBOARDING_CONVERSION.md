# PRD 20 — Customer Onboarding Conversion

## Status

Atualizado. Este documento passa a ser a referencia canonica para o funil de aquisicao, onboarding e trial self-serve do WhaTrack. Onde conflitar com `07_PRD_V1_DOMAIN_ACQUISITION_AUTH_ONBOARDING.md`, este documento prevalece.

**Pre-requisito:** `19_PRD_CLIENT_MANAGEMENT.md` deve estar implementado. O onboarding leve inclui a criacao do primeiro Projeto (cliente) da agencia.

## ICP Definido

**Quem compra:** Agencia de performance que roda Meta Ads com destino direto ao WhatsApp para seus clientes.

**Dor central:** O Meta Ads nao enxerga o que acontece no WhatsApp apos o clique no anuncio. Sem conversao reportada, o algoritmo nao otimiza, a agencia nao prova resultado, e o cliente cancela o servico.

**O que o WhaTrack entrega:** Rastreia qual anuncio gerou qual conversa no WhatsApp, detecta a conversao (via IA ou marcacao manual) e devolve esse evento para o Meta Ads via Conversions API.

**Modelo operacional:**

- Agencia cria sua conta no WhaTrack
- Agencia cria o primeiro Projeto (representa um cliente dela)
- Projeto vira o workspace operacional desse cliente dentro da agencia
- Agencia conecta o WhatsApp do cliente (modo coexistencia, via QR code)
- Agencia conecta a conta de Meta Ads do cliente (OAuth, acesso que ela ja tem)
- WhaTrack rastreia o caminho completo: anuncio → conversa → conversao
- Agencia ve attributicao e repassa o valor para o cliente

**Deteccao de conversao:**

- Automatica via IA, com base no conteudo da conversa
- Manual, via marcacao direta na conversa

## Objetivo

Redesenhar o funil de entrada do WhaTrack para maximizar conversao rapida de novos usuarios (agencias), reduzindo friccao antes do primeiro valor e removendo o padrao atual de mandar o usuario da landing para checkout cedo demais.

Objetivo de negocio:

- aumentar `landing -> account created`
- aumentar `account created -> onboarding complete`
- aumentar `onboarding complete -> first activation milestone`
- aumentar `trial started -> paid conversion`

**Activation milestone (operacional, controlavel na primeira sessao):**

> Agencia criou o primeiro Projeto, conectou WhatsApp (QR code) e conectou Meta Ads (OAuth).

Esse milestone depende apenas de acoes da agencia e pode ser atingido em minutos na primeira sessao.

**Aha moment (produto, nao-deterministico):**

> A agencia ve a primeira conversa rastreada com origem em um anuncio aparecer no dashboard.

O aha moment depende de trafego real de campanha e nao pode ser garantido na primeira sessao. O onboarding deve guiar ate o activation milestone operacional e comunicar claramente que o aha moment acontecera quando houver trafego ativo.

## Problema

O fluxo atual mistura marketing, identidade fiscal, organizacao e pagamento em ordens conflitantes.

Hoje o produto pede decisoes pesadas cedo demais:

- a landing de pricing pode mandar um usuario autenticado direto para checkout
- o usuario anonimo que sai do pricing cai em auth e depois em billing
- o onboarding de organizacao exige PF/PJ + CPF/CNPJ + telefone antes do primeiro valor
- o usuario retorna para billing apos sucesso, nao para uma experiencia de ativacao

Resultado:

- friccao alta antes de ver valor
- dois ou tres funis diferentes para a mesma promessa comercial
- perda de contexto entre landing, cadastro, onboarding e trial
- baixa clareza sobre "qual o proximo passo" para um cliente novo

## Leitura Real do Fluxo Atual

### Fluxo atual implementado no codigo

1. Hero/Header CTA:
- `LandingHero` e `LandingHeader` mandam para `/sign-up`
- arquivo: `src/components/landing/LandingHero.tsx`
- arquivo: `src/components/landing/LandingHeader.tsx`

2. Pricing CTA para usuario anonimo:
- `LandingPricing` abre dialogo de auth
- depois manda para `/sign-in?next=/dashboard/billing` ou `/sign-up?next=/dashboard/billing`
- arquivo: `src/components/landing/LandingPricing.tsx`

3. Pricing CTA para usuario autenticado com organizacao:
- `LandingPricing` chama `/api/v1/billing/checkout`
- redireciona para checkout imediatamente
- arquivo: `src/components/landing/LandingPricing.tsx`

4. Sign-up / Sign-in:
- autenticam e fazem `router.push(nextPath)`
- sem `next`, o destino padrao e `/dashboard`
- arquivos:
  - `src/app/(auth)/sign-up/page.tsx`
  - `src/app/(auth)/sign-in/page.tsx`

5. Dashboard layout:
- se nao existe organizacao, abre `OnboardingDialog`
- arquivo: `src/app/dashboard/layout.tsx`

6. Onboarding atual:
- exige escolha PF/PJ
- exige CPF ou CNPJ
- exige telefone
- cria/atualiza organizacao
- arquivo: `src/components/dashboard/organization/onboarding-dialog.tsx`

7. Billing atual:
- se nao existe assinatura, mostra seletor de planos
- se existe assinatura, mostra status e uso
- arquivo: `src/components/dashboard/billing/billing-page-content.tsx`

8. Pos-checkout:
- retorna para `/billing/success`
- auto-redireciona para `/dashboard/billing`
- arquivo: `src/app/(public)/billing/success/page.tsx`

### Diagnostico do fluxo atual

Existem 3 funis concorrentes:

- `landing hero -> sign-up -> dashboard -> onboarding`
- `pricing anonimo -> auth -> billing -> onboarding -> checkout`
- `pricing autenticado -> checkout direto`

Esse desenho nao e compativel com conversao rapida.

## Principios de Conversao que Grandes SaaS Usam

Padroes recorrentes observados em grandes SaaS:

1. CTA principal leva para `start free` ou `get started`, nao para checkout.
2. O plano escolhido no pricing vira contexto de intencao, nao pagamento imediato.
3. O produto pede so o minimo para entrar.
4. Dados fiscais e detalhes pesados ficam para depois da ativacao inicial.
5. O usuario cai numa experiencia de ativacao guiada, nao numa area administrativa generica.
6. Upgrade e cobranca entram depois de contexto, valor percebido ou fim do trial.
7. Re-engagement automatizado recupera usuarios que abandonam antes do milestone.

Referencias de mercado:

- Shopify: email-first e `Start for free`, com trial antes da decisao final de plano
- HubSpot: `Get started free`, `no credit card required` em varios fluxos e free/trial separado do paid
- Notion: entrada gratuita, CTA de `Sign up` / `Get started`, upgrade depois
- Linear: `Use Linear for free`, upgrade posterior para times e uso avancado

Inferencia de produto:

- o WhaTrack deve se comportar mais como `start free -> activate -> upgrade`, e menos como `marketing -> checkout`.

## Decisao de Produto

### Direcao canonica

O WhaTrack passa a usar este fluxo self-serve:

`Landing -> Sign up -> Lightweight onboarding -> Trial iniciado -> Ativacao guiada -> Upgrade / cobranca`

### Regras fechadas

- o CTA principal da landing nunca deve iniciar checkout
- a landing pode capturar plano e segmento, mas nao cobrar
- o produto deve iniciar com `14 dias gratis` (sem cartao de credito)
- trial de 14 dias porque a agencia precisa de dados reais de campanha para enxergar o valor
- o usuario novo deve cair em uma experiencia de ativacao, nao em `/dashboard/billing`
- agencia e o ICP self-serve — nao ha segmento fora do funil automatico neste momento

### Recomendacao de conversao

Para maximizar conversao, o trial deve iniciar sem checkout upfront.

Isso significa:

- o trial nasce no app como estado de produto
- a cobranca entra quando:
  - o trial esta perto de acabar (dia 11)
  - o trial acabou (dia 14)
  - o usuario decide fazer upgrade antes

Se a decisao de negocio mudar para exigir cartao no trial, essa cobranca deve acontecer depois da conta e do onboarding leve, nunca direto da landing.

### Estado pos-trial

Quando o trial expira sem conversao:

- acesso vira read-only (dados preservados)
- CTA de upgrade persistente em todas as telas
- dados nao sao apagados
- bloquear acoes de escrita (conectar novo WhatsApp, marcar conversao, etc)

Isso evita churn permanente e permite conversao tardia.

### Pricing (direcao definida)

Modelo comercial alinhado ao ICP de agencia:

- base: `R$ 497/mes`
- inclui ate `3 projetos ativos`
- cada projeto inclui:
  - `1 numero de WhatsApp`
  - `1 conta de Meta Ads`
  - `300 conversoes rastreadas / mes`
  - `10.000 creditos de IA / mes`
- projeto adicional: `R$ 97/mes`
- numero de WhatsApp adicional no mesmo projeto: `R$ 49/mes`
- conta Meta Ads adicional no mesmo projeto: `R$ 49/mes`

Regras importantes:

- `Project` e a unidade operacional do cliente da agencia
- conversoes e creditos pertencem ao projeto, nao ao numero de WhatsApp ou conta Meta individual
- add-ons extras compartilham a mesma franquia do projeto

## Fluxo Alvo

### 1. Landing

CTAs:

- Hero/Header: `Teste gratis por 14 dias`
- Pricing: `Comecar gratis`

Comportamento:

- hero/header manda para `/sign-up?intent=start-trial`
- pricing manda para `/sign-up?intent=start-trial&segment=<variant>`
- se o usuario ja estiver autenticado:
  - sem organizacao: vai para `/welcome?intent=start-trial`
  - com organizacao e sem trial/assinatura: vai para `/welcome?intent=start-trial`
  - com trial/assinatura ativa: vai para `/dashboard`

Nota: nao ha mais `plan` como parametro. Com plano unico (PRD 21), o contexto de intencao se limita a `intent`, `segment`, `source` e `campaign`.

O pricing deixa de disparar `/api/v1/billing/checkout` diretamente.

### 2. Auth

Sign-up e sign-in devem preservar:

- `intent`
- `segment`
- `source`
- `campaign`

Destino apos auth:

- `/welcome`

Nao mandar usuario novo para:

- `/dashboard`
- `/dashboard/billing`

exceto quando o fluxo for retorno de sessao existente.

### 3. Onboarding leve

O onboarding inicial deve pedir so o minimo para a agencia entrar no produto:

- nome da pessoa responsavel
- nome da agencia
- nome do primeiro Projeto (cliente que vai configurar)

Nao pedir como requisito inicial:

- CPF
- CNPJ
- razao social
- telefone para cobranca
- dados fiscais completos

Esses dados vao para:

- `Conta`
- `Organizacao`
- ou etapa de pagamento/upgrade, quando realmente necessarios

Ao concluir o onboarding leve, o sistema cria automaticamente o primeiro Projeto com o nome informado.

### 4. Inicio do trial

Ao terminar o onboarding leve:

- criar organizacao
- criar primeiro Projeto
- definir esse Projeto como contexto ativo da primeira sessao
- iniciar trial de 14 dias
- registrar data de fim do trial

Escopo do trial:

- o trial e focado no primeiro cliente da agencia
- durante o trial, liberar `1 Projeto` com:
  - `1 numero de WhatsApp`
  - `1 conta Meta Ads`
  - franquia do projeto para validacao inicial
- projetos adicionais e add-ons operacionais ficam bloqueados ate conversao para pago

Resultado esperado:

- a agencia entra no produto com contexto
- o primeiro Projeto ja esta ativo como workspace
- o trial ja esta ativo
- o dashboard mostra prazo do trial e proximo passo

### 5. Ativacao guiada

Depois do onboarding, o usuario deve cair em uma tela de `Welcome / Get Started`, nao em billing.

Essa tela deve ter checklist de ativacao com dois niveis:

**Activation milestone (operacional, primeira sessao):**

1. Conectar WhatsApp do cliente (QR code em modo coexistencia)
2. Conectar conta de Meta Ads do cliente (OAuth)

**Aha moment (produto, quando houver trafego):**

3. Ver a primeira conversa rastreada com origem em anuncio

O Projeto criado no onboarding ja aparece como contexto ativo na checklist.

Regras:

- destacar um unico "primeiro passo" recomendado: conectar WhatsApp
- permitir pular etapas
- mostrar progresso claro
- o activation milestone e atingido quando os itens 1 e 2 estao completos
- o aha moment (item 3) e rastreado separadamente e depende de trafego real
- apos o activation milestone, exibir mensagem de expectativa: "Quando sua campanha gerar cliques no WhatsApp, a primeira conversa rastreada vai aparecer aqui"
- toda navegacao principal apos onboarding deve manter contexto do projeto ativo

### 6. Billing e upgrade

Billing vira tela de gestao e upgrade, nao entrada primaria do usuario novo.

Quando usar billing:

- trial perto do fim (dia 11 em diante)
- trial expirado
- usuario quer atualizar pagamento
- usuario quer cancelar

### 7. Re-engagement automatizado

Gatilhos de email por comportamento:

- conta criada, nenhuma acao em 48h → email de ajuda para conectar WhatsApp
- WhatsApp conectado, Meta Ads nao conectado em 24h → email para conectar Meta Ads
- trial ativo, sem dado novo em 5 dias → email de diagnostico
- dia 7 do trial → email de valor acumulado
- dia 11 do trial → email de urgencia para upgrade
- dia 14 do trial → email de conversao final

Detalhe do funil de email sera tratado em PRD dedicado (a criar apos PRD 22).

## UX Target

### Antes

`Landing -> possivel checkout -> auth -> onboarding fiscal -> billing -> produto`

### Depois

`Landing -> auth -> onboarding leve (cria Projeto) -> trial 14 dias -> ativacao guiada -> milestone -> billing quando fizer sentido`

## Requisitos Funcionais

### RF1. Landing nao inicia checkout

- remover checkout direto do pricing da landing
- CTA da landing sempre captura intencao e envia para auth ou welcome

### RF2. Persistencia de intencao

Persistir no fluxo:

- `intent`
- `segment`
- `source`
- `campaign`, se existir

Nota: `plan` removido. Com plano unico (PRD 21), nao ha selecao de plano no funil.

### RF3. Welcome route canonica

Criar uma rota canonica de entrada:

- `/welcome`

Responsabilidades:

- receber contexto do funil
- decidir se o usuario precisa criar organizacao
- mostrar onboarding leve (nome da agencia + nome do primeiro Projeto)
- ativar o primeiro Projeto como workspace da sessao
- iniciar trial do produto base com foco no primeiro projeto (PRD 21)
- enviar para ativacao guiada

### RF4. Onboarding leve desacoplado de dados fiscais

O onboarding inicial nao pode depender de PF/PJ + CPF/CNPJ.

### RF5. Trial de 14 dias sem cartao

Ao fim do onboarding, o sistema deve iniciar trial de 14 dias automaticamente, sem exigir dados de pagamento.

### RF6. Criacao automatica do primeiro Projeto

Ao concluir o onboarding leve, o sistema deve criar o primeiro Projeto com o nome informado pela agencia.

Depende de: `19_PRD_CLIENT_MANAGEMENT.md`

### RF7. Ativacao guiada orientada ao produto

A primeira tela logada de um usuario novo deve ser a checklist de ativacao:

1. Conectar WhatsApp (QR code / coexistencia)
2. Conectar Meta Ads (OAuth)
3. Ver primeira conversa rastreada (aha moment, nao-deterministico)

O activation milestone operacional e atingido quando os itens 1 e 2 estao completos (controlavel na primeira sessao). O aha moment (item 3) e rastreado como metrica separada e depende de trafego real de campanha.

### RF8. Estado pos-trial read-only

Quando o trial expira:

- acesso vira read-only
- dados preservados
- CTA de upgrade persistente
- acoes de escrita bloqueadas

### RF9. Re-engagement por comportamento

O sistema deve disparar emails com base em acoes (ou ausencia delas) durante o trial. Ver funil de email em PRD dedicado.

## Requisitos de Conteudo

Copy recomendada:

- Hero CTA: `Teste gratis por 14 dias`
- Pricing CTA: `Comecar gratis`
- Microcopy onboarding: `Configure em minutos e veja o caminho completo do anuncio ate a venda`
- Microcopy trial: `14 dias gratis, sem cartao de credito`

Evitar copy:

- `Assinar agora`
- `Ir para checkout`
- `Cobrar agora`

enquanto o usuario ainda nao viu valor.

## Requisitos Tecnicos

### Arquitetura alvo

1. landing captura intencao
2. auth preserva contexto
3. route/page server-first decide estado do usuario
4. onboarding e client component local de interacao
5. trial e persistido por service de billing
6. ativacao guiada nasce server-first com payload agregado
7. emails de re-engagement disparados por eventos de produto (sem polling)

### Novos contratos esperados

- rota ou page canonica de `welcome`
- service agregado de contexto de onboarding
- trial start service (14 dias, sem cartao)
- checklist service de ativacao
- persistencia de `funnel intent`
- activation milestone tracker (WhatsApp + Meta Ads conectados)
- aha moment tracker (primeira conversa rastreada — separado, nao-deterministico)
- read-only mode para trial expirado

### Regras de implementacao

- telas read-heavy devem nascer server-first
- sem `useEffect` para orquestrar funil
- sem checkout direto da landing
- sem usar `/dashboard/billing` como tela inicial de usuario novo

## O que deve mudar no sistema atual

### Remover do fluxo principal

- landing pricing -> `/api/v1/billing/checkout`
- retorno pos-sign-up direto para `/dashboard/billing`
- obrigatoriedade de PF/PJ e CPF/CNPJ no primeiro onboarding
- pagina de sucesso do billing como parte do onboarding inicial
- qualquer referencia ao trial antigo de 7 dias

### Manter, mas reposicionar

- `/dashboard/billing` como gestao de assinatura
- dados fiscais em `Conta` / `Organizacao`
- checkout para upgrade e continuacao do trial

## Metricas de Sucesso

Primarias:

- `landing_cta_click -> sign_up_started`
- `sign_up_started -> account_created`
- `account_created -> onboarding_completed`
- `onboarding_completed -> trial_started`
- `trial_started -> activation_milestone` (WhatsApp + Meta Ads conectados — controlavel)
- `activation_milestone -> aha_moment` (primeira conversa rastreada — nao-deterministico)
- `trial_started -> paid_conversion`

Secundarias:

- tempo medio ate `trial_started`
- tempo medio ate `activation_milestone` (controlavel)
- tempo medio ate `aha_moment` (nao-deterministico)
- abandono por etapa do welcome
- taxa de conexao de WhatsApp na primeira sessao
- taxa de conexao de Meta Ads na primeira sessao
- taxa de conversao trial → pago por cohort de entrada

## Eventos Analiticos

Eventos minimos:

- `landing_cta_clicked`
- `auth_started`
- `account_created`
- `welcome_opened`
- `onboarding_light_completed`
- `project_created` (primeiro Projeto criado no onboarding)
- `trial_started`
- `whatsapp_connected`
- `meta_ads_connected`
- `activation_milestone_reached` ← WhatsApp + Meta Ads conectados (controlavel)
- `aha_moment_reached` ← primeira conversa rastreada (nao-deterministico)
- `activation_checklist_step_completed`
- `trial_upgrade_started`
- `trial_upgraded`
- `trial_expired_without_conversion`
- `onboarding_step_abandoned` (com step especifico)
- `upgrade_modal_dismissed`

Dimensoes:

- `segment`
- `source`
- `campaign`
- `is_returning_user`
- `days_since_trial_start`

## Fases de Implementacao

### Fase 1. Corrigir o funil de entrada

- landing deixa de chamar checkout
- auth preserva intencao (segment, source, campaign)
- criar rota canonica `/welcome`
- trial passa a ser 14 dias

### Fase 2. Onboarding leve

- separar onboarding inicial de dados fiscais
- onboarding foca em: nome da agencia + nome do primeiro Projeto
- criar Projeto ao fim do onboarding (depende de PRD 19)
- criar trial start ao fim do onboarding
- redirecionar para checklist de ativacao

### Fase 3. Ativacao guiada

- criar welcome/checklist com 3 passos: WhatsApp → Meta Ads → ver primeira conversa
- destacar primeiro passo recomendado
- activation milestone tracker: WhatsApp + Meta Ads conectados (controlavel na primeira sessao)
- aha moment tracker: primeira conversa rastreada (nao-deterministico, separado)
- mensagem de expectativa apos activation milestone: "Quando sua campanha gerar cliques, a primeira conversa rastreada vai aparecer aqui"
- empurrar billing para momento certo

### Fase 4. Estado pos-trial e re-engagement

- implementar read-only mode para trial expirado
- CTA de upgrade persistente
- disparar emails de re-engagement por comportamento (PRD de email funnel, a criar)

### Fase 5. Conversao trial → pago

- reminders de trial (dia 7, dia 11, dia 14)
- CTA de upgrade contextual
- checkout no momento certo

## Fora de Escopo

- redesign completo da landing inteira
- reescrita total de auth
- free plan permanente
- automacao completa de CRM no onboarding inicial
- definicao de valores de pricing (PRD 21)
- funil de email detalhado (PRD dedicado, a criar apos PRD 22)

## Criterios de Aceite

- nenhum CTA da landing dispara checkout diretamente
- todo usuario novo entra por um funil unico e consistente
- o onboarding inicial nao exige dados fiscais completos
- o usuario novo inicia trial de 14 dias e cai em ativacao guiada
- o primeiro Projeto e criado automaticamente ao fim do onboarding
- `/dashboard/billing` deixa de ser a tela inicial do novo cliente
- o activation milestone (WhatsApp + Meta Ads conectados) e rastreado como evento controlavel
- o aha moment (primeira conversa rastreada) e rastreado como evento separado nao-deterministico
- trial expirado resulta em read-only, nao em bloqueio total com perda de dados
- intencao (segment, source, campaign) chega preservada do landing ate o inicio do trial

## Riscos e Trade-offs

- iniciar trial sem cartao aumenta conversao, mas exige controle de abuso (limitar instancias no trial)
- separar dados fiscais do onboarding melhora conversao, mas empurra verificacoes para mais tarde
- modo read-only pos-trial preserva dados mas exige implementacao cuidadosa de permissoes
- 14 dias e suficiente para ver valor, mas depende da agencia ter campanha ativa no periodo

## Recomendacao Final

O WhaTrack deve parar de tratar a landing como entrada de cobranca e passar a trata-la como entrada de trial.

O ICP e a agencia de performance. O valor e provar o caminho completo entre o anuncio e a venda no WhatsApp.

O modelo recomendado para conversao rapida e:

- `marketing captura intencao`
- `auth cria a conta`
- `onboarding leve cria a agencia e o primeiro Projeto`
- `trial de 14 dias ativa o produto`
- `ativacao guiada leva ao milestone: primeira conversa rastreada`
- `billing entra quando o usuario ja entendeu valor`
