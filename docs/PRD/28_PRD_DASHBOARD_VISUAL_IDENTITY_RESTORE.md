# PRD 28 — Restauracao da Identidade Visual do Dashboard

## Status

Proposto. Foco em recuperar a percepcao de qualidade visual do dashboard sem reverter a arquitetura atual, RBAC, projetos ou fluxos recentes.

---

## Contexto

O dashboard no commit `cca4a08` era percebido como mais agradavel e mais "premium". A comparacao com o estado atual mostra que a regressao percebida nao vem de uma unica tela isolada, mas da soma de tres mudancas:

1. paleta visual mais saturada e mais "brand-first"
2. navegacao lateral mais densa e mais utilitaria
3. moldura estrutural da aplicacao com menos silencio visual

O objetivo deste PRD nao e fazer rollback do produto nem reconstruir tela por tela o estado antigo. O objetivo e recuperar a linguagem visual que fazia o sistema parecer mais refinado, mantendo:

- RBAC
- seletor de projeto
- novas rotas e modulos
- organizacao atual de settings e integracoes

---

## Problema

Hoje o dashboard transmite mais peso cognitivo do que deveria.

Sinais praticos:

- excesso de verde como cor primaria, sem area neutra suficiente para descanso visual
- sidebar com muitos grupos, labels e itens permanentes
- header com mais sinais concorrendo por atencao
- configuracoes com cara de painel administrativo, nao de produto premium
- diferenca fraca entre superficies, hierarquia e densidade de informacao

Impacto esperado no negocio:

- pior primeira impressao do produto
- menor percepcao de valor e sofisticacao
- sensacao de interface "carregada" mesmo quando funcionalmente correta
- queda de confianca em modulos novos por parecerem menos coesos

---

## Objetivo

Recuperar a identidade visual premium do dashboard anterior, reinterpretada sobre a arquitetura atual.

O dashboard deve voltar a parecer:

- mais calmo
- mais sofisticado
- mais coeso
- menos administrativo
- mais proximo de um SaaS premium do que de um backoffice generico

---

## Nao objetivos

Este PRD nao cobre:

- mudanca de arquitetura de dados
- rollback de RBAC ou permissoes
- remocao do seletor de projeto
- redesign completo de fluxos funcionais
- reescrita completa de paginas de dominio
- mudanca de copy ampla do produto

---

## Hipotese principal

Se reduzirmos a saturacao da moldura global do dashboard, simplificarmos a sidebar e recuperarmos uma hierarquia visual mais neutra e mais espaçada, a percepcao de qualidade volta sem precisar abrir mao das capacidades adicionadas depois de `cca4a08`.

Corolario pratico:

- a referencia antiga serve para orientar linguagem visual
- a execucao deve acontecer por sistema visual compartilhado
- telas novas devem nascer dentro desse padrao, sem depender de comparacao historica

---

## Usuario e contexto

Usuario principal:

- dono de operacao
- gestor de trafego
- agencia
- operador comercial que precisa confiar no sistema diariamente

Momento de uso:

- uso recorrente ao longo do dia
- leitura de metricas
- navegacao frequente entre CRM, captacao e configuracoes

O dashboard precisa privilegiar legibilidade prolongada, orientacao rapida e sensacao de ordem.

---

## Referencia de linguagem: antes vs hoje

### Referencia anterior (`cca4a08`)

- base cromatica mais neutra
- acento mais contido
- menos itens competindo na navegacao
- mais sensacao de produto premium
- maior leveza visual

### Estado atual

- cor de marca aplicada com mais agressividade
- sidebar mais longa e mais segmentada
- mais badges, labels e pontos de atencao permanentes
- casca da aplicacao mais densa
- melhor cobertura funcional, pior sensacao visual

---

## Decisao estrutural: padrao, nao replicacao

Nao vamos validar o redesign tela por tela tomando `cca4a08` como espelho, porque o produto atual ja possui telas, modulos e responsabilidades que nao existiam naquele ponto.

Logo, a restauracao da identidade visual deve ser guiada por um padrao canonico do dashboard.

Esse padrao precisa responder:

- como o dashboard usa cor
- como o dashboard organiza navegacao
- como o dashboard define densidade
- como o dashboard desenha shells, cards, tabelas e formularios
- como telas novas devem parecer "nativas" do produto

`cca4a08` vira referencia de sensacao, nao blueprint de interface.

---

## Decisoes de produto

### Decisao 1: o dashboard volta a ser "neutral-first"

A marca continua presente, mas deixa de ser a base dominante da interface.

Diretriz:

- superfices principais voltam a ser neutras
- verde de marca vira cor de acento e estado, nao pano de fundo visual do produto inteiro
- charts e CTA continuam podendo usar marca
- sidebar e backgrounds devem priorizar neutralidade

Resultado esperado:

- menos cansaco visual
- maior percepcao de refinamento
- melhor contraste entre conteudo e navegacao

### Decisao 2: a sidebar volta a ser um instrumento de orientacao, nao um inventario

A navegacao deve parecer curta, clara e intencional, mesmo mantendo o volume funcional atual.

Diretriz:

- reduzir ruido visual de labels e separadores
- agrupar melhor itens secundarios
- tratar configuracoes como area de segundo nivel, nao como parede de links
- preservar RBAC sem transformar a sidebar em "menu de permissoes"

Resultado esperado:

- onboarding cognitivo mais rapido
- menor sensacao de sistema pesado
- leitura mais limpa do que e principal e do que e secundario

### Decisao 3: a moldura do produto precisa recuperar silencio

Header, sidebar, containers e cards precisam parar de competir com o conteudo da pagina.

Diretriz:

- mais respiro lateral e vertical
- menos elementos persistentes no frame
- bordas e divisores mais discretos
- destaque apenas para o que importa na tela atual

Resultado esperado:

- conteudo principal volta a liderar a atencao
- sensacao geral de maturidade aumenta

### Decisao 4: toda tela nova deve herdar a identidade visual pelo sistema base

O produto nao pode depender de "bom gosto local" por tela.

Diretriz:

- identidade visual precisa estar embutida em tokens, shells e componentes compartilhados
- novas paginas devem se encaixar no sistema sem precisar de tratamento artesanal completo
- desvios visuais passam a ser excecao justificada, nao padrao de evolucao

Resultado esperado:

- menor deriva visual com o tempo
- maior consistencia entre modulos antigos e novos
- menos necessidade de revisao estetica tela a tela

---

## Escopo

### Em escopo

1. tema do dashboard
2. sidebar
3. header global
4. shells compartilhados de pagina
5. tokens de superficie, borda, accent e estados
6. regras de espacamento e densidade dos componentes compartilhados
7. alinhamento visual das paginas de settings mais acessadas
8. definicao do padrao canonico para telas novas do dashboard

### Fora de escopo nesta fase

1. redesign completo das telas de inbox
2. redesign completo de charts individuais
3. revisao de landing page
4. revisao de autenticacao publica
5. refactor funcional de CRUDs

---

## Requisitos do produto

### 0. Padrao canonico de identidade visual

O dashboard precisa ter um padrao visual declarativo que possa ser aplicado em telas existentes e novas.

Esse padrao deve cobrir no minimo:

- tema e tokens
- comportamento visual de sidebar e header
- shells por tipo de pagina
- hierarquia de secoes
- estilo de cards
- tabelas e toolbars
- formularios e blocos de configuracao
- badges, estados e destaques

Validacao:

- uma tela nova deve conseguir ser implementada usando esse sistema sem inventar linguagem visual propria
- uma tela existente deve poder ser alinhada ao padrao com diff incremental

### 1. Tema visual

O dashboard deve adotar uma base visual neutra e premium.

Requisitos:

- fundos principais mais neutros e menos esverdeados
- sidebar com menor tinta visual que hoje
- accent menos saturado em estados default
- verde reservado para CTA, foco, sucesso e destaques pontuais
- dark mode tambem deve parecer premium, nao apenas "escuro com verde"

### 2. Sidebar

A sidebar deve continuar suportando o produto atual, mas com melhor hierarquia.

Requisitos:

- reduzir a sensacao de comprimento e fragmentacao
- simplificar labels de grupos
- reduzir competicao entre icones, textos e itens auxiliares
- manter seletor de projeto, mas com menor protagonismo visual
- manter configuracoes acessiveis sem deixar o bloco excessivamente longo

### 3. Header global

O header deve ser funcional, mas visualmente discreto.

Requisitos:

- breadcrumb continua, mas com menor ruido
- badges e sinais de status devem ser secundarios
- acoes da pagina continuam possiveis, sem virar centro visual permanente
- espacamento horizontal deve acompanhar telas largas sem parecer vazio ou apertado

### 4. Shells e containers

Os shells compartilhados precisam reforcar consistencia visual.

Requisitos:

- padronizar largura util por tipo de tela
- reforcar respiro entre header, toolbar, secoes e cards
- evitar blocos com cara de "cartao empilhado sem criterio"
- settings devem ter aparencia de produto premium, nao de CRUD tecnico

### 5. Settings e paginas administrativas

As paginas de configuracao sao parte central da percepcao de qualidade.

Requisitos:

- perfil, organizacao, equipe, integracoes e assinatura devem compartilhar linguagem visual
- formularios e listas precisam ter hierarquia clara
- secoes devem parecer deliberadas, nao improvisadas
- integrar melhor visualmente cards, titulos, descricoes e acoes

---

## Principios de design

1. Menos tinta, mais hierarquia.
2. Marca por acento, nao por saturacao constante.
3. Moldura discreta, conteudo protagonista.
4. Menos opcoes aparentes por vez.
5. Densidade controlada: nada apertado, nada inflado.
6. Premium por disciplina visual, nao por efeito decorativo.

---

## Padrao canonico proposto

### 1. Cor

- base neutra
- accent restrito
- marca reservada para foco, CTA, selecionado e sucesso
- warning e destructive com uso semanticamente controlado

### 2. Navegacao

- sidebar como estrutura de orientacao primaria
- grupos com poucas palavras e baixa interferencia visual
- itens secundarios agrupados sem excesso de divisores
- configuracoes com visual mais calmo que o conteudo operacional

### 3. Shells

- um shell para paginas de leitura e overview
- um shell para CRUD/lista operacional
- um shell para settings e configuracoes
- casos especiais documentados explicitamente

### 4. Superficies

- cards com hierarquia clara
- bordas discretas
- sombras leves
- espacamento previsivel entre blocos

### 5. Densidade

- titulos respiram
- tabelas nao parecem apertadas
- formularios nao parecem inflados
- toolbar, filtros e cards seguem o mesmo ritmo vertical

### 6. Estados

- badge, selected, hover, focus e empty states seguem uma mesma gramatica visual
- destaque visual proporcional a importancia da acao

### 7. Telas novas

- toda tela nova precisa escolher um shell canonicamente suportado
- toda tela nova deve usar os tokens e componentes-base
- novos estilos livres so entram se houver necessidade real de produto

---

## Proposta de entrega em fases

### Fase 1 — Foundation visual

Objetivo:

- corrigir a percepcao global sem tocar em todas as paginas

Entregas:

- revisao de tokens em `globals.css`
- revisao de superficies, bordas, accent e ring
- ajuste visual de sidebar e header
- ajuste de `page-shell`, `page-header` e componentes de moldura

Criterio de sucesso:

- o dashboard ja transmite a nova identidade apenas pela moldura compartilhada e pelos componentes-base, sem depender de refazer todas as telas

### Fase 2 — Navegacao e configuracoes

Objetivo:

- reduzir o peso das areas mais sensiveis para a percepcao do usuario

Entregas:

- simplificacao visual da sidebar
- refinamento dos grupos e labels
- padronizacao das telas de settings prioritarias
- tratamento visual do seletor de projeto

Criterio de sucesso:

- a sidebar parece menor e mais clara sem perda funcional

### Fase 3 — Refinamento de paginas-chave

Objetivo:

- fechar as inconsistencias restantes nas telas com maior trafego

Entregas:

- dashboard principal
- analytics
- projects
- leads
- settings/integrations
- settings/profile

Criterio de sucesso:

- as paginas principais compartilham a mesma linguagem visual e o padrao fica aplicavel tambem a telas novas

---

## Criterios de aceite

### Criterios visuais

1. O dashboard precisa parecer visualmente mais proximo da linguagem de `cca4a08` do que do estado atual.
2. A paleta principal do dashboard precisa ser predominantemente neutra.
3. A sidebar deve transmitir menos densidade sem perder navegabilidade.
4. O header deve competir menos com o conteudo principal.
5. Settings devem parecer parte do mesmo sistema premium.
6. Uma tela nova do dashboard deve conseguir seguir o padrao sem criar identidade visual paralela.

### Criterios funcionais

1. Nenhuma permissao atual pode ser perdida.
2. O seletor de projeto deve continuar funcionando.
3. Nenhuma rota precisa mudar apenas por causa do refresh visual.
4. Dark mode e light mode devem permanecer suportados.

### Criterios tecnicos

1. Priorizar mudancas em tokens e componentes compartilhados antes de mexer em paginas isoladas.
2. Evitar hardcode de cor em novos ajustes.
3. Reutilizar os shells compartilhados existentes, ajustando-os em vez de multiplicar variacoes.
4. Formalizar o padrao no `design-system` do dashboard para consulta e auditoria.

---

## Metricas de sucesso

### Qualitativas

- feedback interno: "mais premium", "mais leve", "mais organizado"
- menor comentario espontaneo de "painel carregado"
- validacao da nova linguagem visual como padrao do produto, e nao apenas como ajuste de telas isoladas

### Quantitativas

- tokens, shells e componentes-base atualizados e adotados nas telas prioritarias
- no minimo 5 telas-chave revisadas e aprovadas visualmente
- zero regressao funcional nos fluxos principais de navegacao
- zero criacao de shell paralelo desnecessario

---

## Riscos

1. Reaproximar demais de `cca4a08` e perder coerencia com a marca atual.
2. Mexer em tokens globais e abrir regressao visual em paginas nao auditadas.
3. Tentar resolver tudo por pagina, em vez de corrigir primeiro a moldura compartilhada.
4. Confundir "menos carregado" com "menos informativo".
5. Repetir a deriva visual no futuro por falta de um padrao explicitado.

---

## Mitigacoes

1. Tratar `cca4a08` como referencia de linguagem, nao como rollback literal.
2. Comecar por tokens e shells compartilhados.
3. Validar sempre em light e dark.
4. Documentar o padrao na rota de `design-system` do dashboard.
5. Revisar visualmente pelo menos:
   - `/dashboard`
   - `/dashboard/analytics`
   - `/dashboard/projects`
   - `/dashboard/settings/profile`
   - `/dashboard/settings/integrations`

---

## Dependencias

- alinhamento de direcao visual: "neutral-first" com marca por acento
- disponibilidade para validacao do sistema visual compartilhado
- eventual uso da rota `/dashboard/design-system` como pagina de auditoria visual

---

## Sequencia recomendada de implementacao

1. Ajustar tokens globais de cor e superficie.
2. Ajustar sidebar e header.
3. Ajustar shells compartilhados.
4. Formalizar o padrao no `design-system`.
5. Revisar settings prioritarios.
6. Revisar paginas-chave do dashboard.
7. Fazer rodada final de polimento visual.

---

## Resultado esperado

Ao final, o usuario deve sentir que o produto:

- continua mais completo do que em `cca4a08`
- mas voltou a ter a qualidade visual que existia naquela fase

Em termos práticos:

- mesma capacidade funcional de hoje
- melhor percepcao de valor
- menos peso visual
- mais confianca no uso diario
