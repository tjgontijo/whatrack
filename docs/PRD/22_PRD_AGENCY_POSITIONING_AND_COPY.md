# PRD 22 — Agency Positioning and Copy

## Status

Proposto. Este documento define o reposicionamento de copy do WhaTrack para o ICP de agencias e gestores de trafego.

**Dependencia:** PRD 21 (modelo de pricing por projeto) deve estar fechado. A copy reflete o modelo comercial definido la.

## Objetivo

Alinhar a comunicacao do produto, da landing e do onboarding ao ICP correto:

- agencias de performance
- gestores de trafego
- operacoes que rodam Meta Ads com destino ao WhatsApp para clientes

O objetivo nao e apenas “ajustar texto”. E reposicionar a promessa do produto para refletir a dor real que o WhaTrack resolve.

## Contexto

O produto deixou de mirar o usuario final B2C como prioridade.

O ICP mais aderente ao que o WhaTrack realmente entrega e:

- agencia que precisa provar resultado para clientes
- gestor de trafego que precisa conectar anuncio a conversa e conversa a conversao
- operacao que sofre para mostrar atribuicao e justificar fee/retencao

O sistema, porem, ainda carrega copy misturada:

- partes com linguagem generica de B2C
- partes com linguagem de “leads” e “empresa” ampla demais
- partes com linguagem de billing antigo (`Starter`, `Pro`, `Agency`, `7 dias`)

## Problema

Quando a copy fala com o publico errado:

- a landing atrai perfil com baixa aderencia
- o onboarding pede coisas na ordem errada
- o usuario nao entende rapidamente o “aha” do produto
- o trial converte menos porque a promessa nao encaixa com a dor principal

## Decisao de Posicionamento

O WhaTrack passa a se posicionar como:

> plataforma para agencias e gestores de trafego provarem, via WhatsApp, quais anuncios realmente geram resultado.

Promessa central:

- ligar Meta Ads ao WhatsApp
- detectar conversoes
- devolver sinal para o Meta Ads
- provar ROI para o cliente da agencia

## Mensagem Principal

### Tese principal

`Prove para seus clientes quais anuncios realmente geram conversas e conversoes no WhatsApp.`

### Tese secundaria

`Pare de defender fee no achismo. Mostre atribuicao real do anuncio ate a venda.`

### O que o produto faz

- conecta WhatsApp do cliente
- conecta Meta Ads do cliente
- rastreia anuncio → conversa → conversao
- mostra atribuicao no dashboard
- envia sinal de volta para o Meta Ads

## O que deve sair da copy

Evitar linguagem ampla, vaga ou desalinhada:

- “aumente suas vendas” sem contexto
- “mais leads para sua empresa”
- “para qualquer negocio”
- “para pequenas empresas em geral”
- “software para WhatsApp” sem mencionar atribuicao ou Meta
- destaque excessivo de features administrativas antes da dor principal

Tambem remover do material ativo:

- referencias a `Starter`, `Pro`, `Agency`
- referencias a `7 dias`
- referencias a billing por `eventos/mes`
- referencias a cobranca que nao expliquem o modelo por cliente/projeto e add-ons

## O que deve entrar

### Linguagem recomendada

- “agencia”
- “gestor de trafego”
- “cliente da agencia”
- “Meta Ads”
- “WhatsApp”
- “atribuicao”
- “conversao”
- “prova de resultado”
- “reter cliente”
- “mostrar ROI”

### Promessas recomendadas

- “prove quais anuncios viram conversa e venda no WhatsApp”
- “mostre atribuicao real para o seu cliente”
- “envie de volta para o Meta Ads o que realmente converteu”
- “pare de justificar fee sem dado”

## Pilares de Mensagem

### Pilar 1. Prova de resultado

Mensagem:

- o WhaTrack existe para a agencia provar que seu trabalho gerou resultado

### Pilar 2. Atribuicao do anuncio ao WhatsApp

Mensagem:

- o clique no anuncio nao pode morrer no WhatsApp sem rastreio

### Pilar 3. Retencao de clientes

Mensagem:

- quando a agencia mostra dado confiavel, o cliente questiona menos

### Pilar 4. Operacao simples

Mensagem:

- conectar cliente no WhaTrack precisa ser rapido e claro

## Locais que precisam de ajuste

### Landing principal

Arquivos-alvo provaveis:

- `src/components/landing/types.ts`
- `src/components/landing/LandingHero.tsx`
- `src/components/landing/LandingPricing.tsx`
- `src/components/landing/LandingCTA.tsx`
- `src/components/landing/LandingHeader.tsx`
- paginas em `src/app/(public)/solucoes/*`
- `src/app/layout.tsx` (meta tags, title, OG tags)
- `src/app/(public)/page.tsx` ou equivalente (meta tags da landing)

### Auth e onboarding

Arquivos-alvo provaveis:

- `src/app/(auth)/sign-up/page.tsx`
- `src/app/(auth)/sign-in/page.tsx`
- `src/components/dashboard/organization/onboarding-dialog.tsx`
- futura rota `/welcome`

### Billing e telas de sucesso

Arquivos-alvo provaveis:

- `src/app/(public)/billing/success/page.tsx`
- `src/components/dashboard/billing/*`

## Diretrizes por etapa do funil

### 1. Landing

Objetivo:

- fazer a agencia se reconhecer imediatamente

Hero recomendado:

- headline: `Prove para seus clientes quais anuncios realmente vendem no WhatsApp.`
- subheadline: `Conecte Meta Ads e WhatsApp, detecte conversoes e mostre atribuicao real sem planilha nem achismo.`
- CTA: `Teste gratis por 14 dias`

### 2. Pricing

Objetivo:

- mostrar modelo simples, alinhado ao ICP

Copy:

- falar em clientes ativos da agencia
- explicar que `Project` e o nome interno do cliente dentro do produto
- explicar o pacote base e os add-ons operacionais
- evitar linguagem de “plano para empresa”

Modelo comercial que a copy deve refletir:

- `R$ 497 / mes`
- inclui `3 clientes ativos`
- cada cliente inclui:
  - `1 WhatsApp`
  - `1 conta Meta Ads`
  - `300 conversoes / mes`
  - `10.000 creditos de IA / mes`
- `R$ 97` por cliente adicional
- `R$ 49` por WhatsApp adicional no mesmo cliente
- `R$ 49` por conta Meta Ads adicional no mesmo cliente

### 3. Sign-up

Objetivo:

- reforcar que a conta criada e da agencia

Copy sugerida:

- titulo: `Crie a conta da sua agencia`
- subtitulo: `Comece conectando o primeiro cliente e prove resultado em poucos minutos.`

### 4. Onboarding

Objetivo:

- fazer a agencia criar seu primeiro projeto/cliente

Copy sugerida:

- `Nome da agencia`
- `Nome do primeiro cliente`
- `Vamos configurar o primeiro cliente da sua operacao`

### 5. Welcome / ativacao

Objetivo:

- orientar a agencia para chegar ao activation milestone

Copy sugerida:

- `Conecte o WhatsApp e o Meta Ads do seu primeiro cliente`
- `Quando os anuncios gerarem cliques, a primeira conversa rastreada aparecera aqui`

## CTA Framework

### CTAs principais

- `Teste gratis por 14 dias`
- `Comecar gratis`
- `Configurar primeiro cliente`
- `Conectar WhatsApp`
- `Conectar Meta Ads`

### CTAs que devem sair

- `Assinar agora`
- `Comprar agora`
- `Criar conta gratuita` sem contexto
- `Explorar plataforma` cedo demais

## Requisitos Funcionais de Conteudo

### RF1. ICP unico na landing

Toda a landing principal deve falar prioritariamente com agencia/gestor de trafego.

### RF2. Copy coerente no funil inteiro

Landing, auth, onboarding, welcome e billing devem usar a mesma tese de valor.

### RF3. Billing antigo removido da copy

Nao pode sobrar material ativo falando em modelo antigo de planos/trial.

### RF4. Projeto como cliente da agencia

O onboarding e as telas internas devem falar em:

- agencia
- cliente
- projeto

na ordem correta.

### RF5. Modelo comercial legivel

A copy de pricing e billing deve deixar claro:

- o que esta incluido no plano base
- o que e cobrado como cliente adicional
- o que e cobrado como add-on operacional
- que creditos e conversoes pertencem ao projeto, nao ao numero extra

## Criterios de Aceite

- landing principal fala claramente com agencias/gestores de trafego
- copy principal fala de atribuicao, ROI e prova de resultado
- auth e onboarding deixam claro que a conta e da agencia
- o primeiro cliente aparece como projeto no discurso do produto
- nao restam referencias ativas ao posicionamento B2C generico
- nao restam referencias ativas ao billing antigo (`Starter`, `Pro`, `Agency`, `7 dias`)
- meta tags (title, description, OG tags) refletem posicionamento de agencia

## Fora de Escopo

- redesign visual completo da landing
- rebranding total do produto
- manifesto de marca
- funil de email detalhado

## Ordem de Execucao Recomendada

1. Ajustar `types.ts` da landing
2. Ajustar hero, CTA e pricing
3. Ajustar auth
4. Ajustar onboarding/welcome
5. Ajustar billing/success
6. Revisar microcopies residuais no dashboard

## Riscos e Trade-offs

- falar com agencia melhora aderencia, mas reduz atratividade para publico genérico
- se a copy mudar antes do produto refletir `Project`, cria promessa desalinhada
- billing e onboarding precisam evoluir junto com a copy para o reposicionamento ficar crível

## Recomendacao Final

O WhaTrack deve parar de parecer uma ferramenta generica de “mais leads” e passar a parecer uma ferramenta de **prova de resultado para agencias**.

Se a pivotagem de ICP esta decidida, a copy precisa assumir isso sem timidez.
