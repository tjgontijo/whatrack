---
name: prd-pack-generator
description: Use esta skill para criar, revisar ou padronizar PRDs em formato de pacote documental com README.md, CONTEXT.md, DIAGNOSTIC.md, TASKS.md e QUICK_START.md. Acione quando o usuario pedir PRD, product requirements document, diagnostico tecnico, plano de implementacao, breakdown de tasks, refinamento de feature, documentacao de produto ou pacote de requisitos para Codex implementar depois.
---

# Skill: PRD Pack Generator

## Objetivo

Criar PRDs completos em formato de pacote documental, seguindo o padrao:

```txt
PRD-XXX-feature-slug/
  README.md
  CONTEXT.md
  DIAGNOSTIC.md
  TASKS.md
  QUICK_START.md
```

O PRD deve servir como ponte entre analise de produto, diagnostico tecnico e execucao por Codex.

O resultado deve deixar claro:

1. O que a feature ou problema representa.
2. Como o sistema funciona hoje.
3. Quais problemas, riscos ou lacunas existem.
4. Quais tasks devem ser executadas.
5. Qual ordem de implementacao deve ser seguida.
6. Como testar e validar a entrega.

## Regras obrigatorias

1. Gerar sempre uma pasta de PRD, nao apenas um arquivo solto.
2. Gerar sempre os 5 arquivos principais.
3. Escrever em portugues claro e operacional.
4. Usar Markdown.
5. Usar exemplos concretos de arquivos, rotas, services, schemas, repositories, models e endpoints quando existirem.
6. Separar contexto, diagnostico e tasks.
7. Ordenar problemas por severidade.
8. Converter problemas em tasks acionaveis.
9. Incluir criterios de aceitacao por task.
10. Incluir tempo estimado quando houver informacao suficiente.
11. Incluir riscos e bloqueadores quando existirem.
12. Evitar generalidades sem acao concreta.
13. Nao implementar codigo, exceto snippets pequenos para explicar a solucao.
14. Nao inventar arquivos existentes. Se nao tiver certeza, marcar como presumido ou a confirmar.
15. Nao usar travessao. Use virgula, dois pontos ou hifen simples.

## Nome da pasta

Use este padrao:

```txt
PRD-XXX-feature-slug/
```

Exemplos:

```txt
PRD-001-authentication/
PRD-002-user-onboarding/
PRD-003-payment-reconciliation/
PRD-004-notification-center/
```

Regras:

1. `XXX` deve ter 3 digitos.
2. O slug deve ser em kebab-case.
3. O slug deve representar o dominio ou problema principal.
4. Se o numero nao for informado, inferir o proximo numero apenas se houver PRDs existentes no repositorio.
5. Se nao houver como inferir o numero, usar `PRD-XXX-[slug]` e indicar que o numero deve ser definido.

## Estrutura final obrigatoria

```txt
PRD-XXX-feature-slug/
  README.md
  CONTEXT.md
  DIAGNOSTIC.md
  TASKS.md
  QUICK_START.md
```

## Papel de cada arquivo

### README.md

Resumo executivo do PRD.

Deve permitir que alguem entenda em poucos minutos:

1. O que este PRD cobre.
2. Status da documentacao.
3. Quantidade de problemas ou entregas.
4. Severidade geral.
5. Fases de implementacao.
6. Tempo total estimado.
7. Arquivos principais.
8. Como comecar.
9. Matriz de risco resumida.

### CONTEXT.md

Explicacao profunda do dominio ou feature.

Deve responder:

1. O que e isso no sistema?
2. O que nao e?
3. Quais entidades, modelos ou conceitos existem?
4. Qual o fluxo completo?
5. Quais estados existem?
6. Quais integracoes existem?
7. Quais validacoes sao esperadas?
8. Quais permissoes se aplicam?
9. Por que isso e importante?
10. Qual resumo tecnico para implementacao?

### DIAGNOSTIC.md

Analise dos problemas, riscos, gaps ou melhorias.

Deve conter:

1. Resumo executivo.
2. Problemas criticos.
3. Problemas moderados.
4. Problemas menores.
5. O que esta bem.
6. Matriz de risco.
7. Ordem de fixacao.
8. Proximos passos.

### TASKS.md

Plano de implementacao.

Deve transformar cada problema ou requisito em uma task clara.

Cada task deve conter:

1. ID da task, por exemplo T1, T2, T3.
2. Titulo.
3. Tempo estimado.
4. Problema ou objetivo.
5. Localizacao tecnica.
6. O que fazer.
7. Snippet quando ajudar.
8. Criterios de aceitacao.
9. Como testar, quando aplicavel.
10. Dependencias ou bloqueadores.

### QUICK_START.md

Guia rapido para quem vai executar.

Deve conter:

1. TL;DR.
2. Tabela resumida de problemas ou tasks.
3. Criticos primeiro.
4. Como testar os principais cenarios.
5. Arquivos principais.
6. Comandos de inicio.
7. Sugestao de branch e commits.

## Fluxo de trabalho para gerar um PRD

Antes de escrever:

1. Identificar o dominio principal.
2. Localizar arquivos existentes relacionados ao dominio.
3. Entender models, schemas, services, rotas, componentes e integracoes.
4. Separar comportamento atual de comportamento desejado.
5. Identificar problemas reais, riscos ou lacunas.
6. Classificar severidade.
7. Definir tasks executaveis.
8. Estimar esforco.

Se o repositorio estiver disponivel, procurar por:

```txt
src/app
src/app/api
src/features
src/services
src/server
src/lib
src/schemas
src/components
prisma/schema.prisma
```

Tambem procurar termos relacionados ao dominio, por exemplo:

```txt
workflow
dataCollection
data-collection
appointment
payment
notification
user
patient
organization
```

## Padrao de severidade

Classifique problemas assim:

### Critico

Use quando houver:

1. Risco de seguranca.
2. Perda ou corrupcao de dados.
3. Fluxo principal quebrado.
4. Acesso indevido.
5. Bug que bloqueia usuario ou operacao.
6. Compliance ou privacidade comprometidos.

### Moderado

Use quando houver:

1. Performance ruim.
2. Observabilidade insuficiente.
3. Validacao incompleta.
4. UX confusa mas nao bloqueante.
5. Risco operacional medio.
6. Falta de robustez.

### Menor

Use quando houver:

1. Melhoria de experiencia.
2. Texto, feedback ou informacao ausente.
3. Refinamento visual.
4. Conveniencia.
5. Otimizacao pequena.

## Padrao de risco

Use matriz com estas colunas:

```md
| Problema | Severidade | Probabilidade | Risco | Esforco |
|----------|------------|---------------|-------|---------|
```

Valores aceitos:

```txt
Severidade: Alto, Medio, Baixo
Probabilidade: Alta, Media, Baixa
Risco: CRITICO, MEDIO, BAIXO
Esforco: 30min, 1h, 1-2h, 2h, 2-3h, N/A
```

Emojis podem ser usados para leitura rapida:

```txt
🔴 Critico
🟡 Moderado
🟢 Menor
✅ Concluido ou valido
⚠️ Atencao
❌ Problema
```

## Padrao de fases

Agrupe tasks por fase:

```md
## 🔴 Fase 1: Criticos ([tempo])

## 🟡 Fase 2: Robustez ([tempo])

## 🟢 Fase 3: Melhorias ([tempo])
```

Use a ordem:

1. Corrigir riscos criticos.
2. Aumentar robustez.
3. Melhorar UX e refinamentos.

## Template: README.md

Use este template:

```md
# PRD-XXX: [Nome da Feature] ([Nome em Portugues])

**Status:** [status]
**Data:** YYYY-MM-DD
**Versao:** 1.0

---

## 📋 O Que e Este PRD?

Este PRD define [resumo do dominio, feature ou problema].

**Documento:** [o que sera definido]

**Tempo Total:** [estimativa]

---

## 📂 Estrutura do PRD

```txt
PRD-XXX-feature-slug/
├── README.md (este arquivo)
├── CONTEXT.md (contexto do dominio)
├── DIAGNOSTIC.md (problemas e riscos)
├── TASKS.md (plano de implementacao)
└── QUICK_START.md (guia rapido)
```

---

## 🎯 Resumo Executivo

### Status Atual

- [item 1]
- [item 2]
- [item 3]

### Severidade

| Criticos | Moderados | Menores |
|----------|-----------|---------|
| 🔴 [n]   | 🟡 [n]    | 🟢 [n]  |

### Ordem de Fixacao

| Fase | Tasks | Tempo |
|------|-------|-------|
| 1: Criticos | T1-T[n] | [tempo] |
| 2: Robustez | T[n]-T[n] | [tempo] |
| 3: Melhorias | T[n]-T[n] | [tempo] |

**Total:** [tempo total]

---

## 🔴 Problemas Criticos

### T1: [titulo]

**Impacto:** [impacto]
**Solucao:** [solucao curta]

---

## 🟡 Problemas Moderados

### T[n]: [titulo]

**Impacto:** [impacto]
**Solucao:** [solucao curta]

---

## 🟢 Problemas Menores

### T[n]: [titulo]

**Impacto:** [impacto]
**Solucao:** [solucao curta]

---

## 💾 Arquivos Principais

- `[arquivo]` - [papel]
- `[arquivo]` - [papel]

---

## ✅ Como Comecar

1. Ler: CONTEXT.md, DIAGNOSTIC.md, QUICK_START.md, TASKS.md
2. Criar branch: `git checkout -b feature/[slug]`
3. Executar tasks na ordem recomendada
4. Fazer commit por task
5. Rodar testes

---

## 📊 Matriz de Risco

| Task | Severidade | Probabilidade | Risco | Esforco |
|------|------------|---------------|-------|---------|
| T1 | Alto | Alta | CRITICO | 1h |

---

**Status:** [status final]
```

## Template: CONTEXT.md

Use este template:

```md
# Context: [O Que e o Dominio no Sistema]

**Ultima atualizacao:** YYYY-MM-DD

---

## 📌 Definicao

[Dominio] e [definicao clara].

**O que e:**

- [item]
- [item]

**O que NAO e:**

- [item]
- [item]

---

## 🔄 Fluxo Completo

```txt
[etapa 1]
  ↓
[etapa 2]
  ↓
[etapa 3]
```

Explique cada etapa com detalhes operacionais.

---

## 💾 Dados Armazenados

### [Model] Model

```typescript
{
  id: string,
  field: string,
  created_at: Date,
  updated_at: Date
}
```

---

## 🎯 Estados

```txt
state_a
  ↓
state_b
  ↓
state_c
```

### Estados Detalhados

#### state_a

- [descricao]
- [quando usar]

#### state_b

- [descricao]
- [quando usar]

---

## 🔗 Integracao com Outros Dominios

### [Dominio] ← [Outro Dominio]

[explicacao]

### [Dominio] → [Outro Dominio]

[explicacao]

---

## 📊 Exemplo Real: Flow Completo

Descreva um exemplo real ponta a ponta.

---

## 📋 Validacoes

### Input Validation

- [validacao]
- [validacao]

### Business Logic Validation

- [validacao]
- [validacao]

---

## 🔐 Permissoes

| Acao | Quem Pode | Condicao |
|------|-----------|----------|
| [acao] | [perfil] | [condicao] |

---

## 🎯 Por Que Isso e Critico?

- [motivo]
- [motivo]

---

## 📝 Resumo para Implementacao

- [ponto tecnico]
- [ponto tecnico]
```

## Template: DIAGNOSTIC.md

Use este template:

```md
# Diagnostic: Problemas no Sistema de [Dominio]

**Data:** YYYY-MM-DD
**Status:** [status]
**Escopo:** [escopo tecnico]

---

## 📋 Resumo Executivo

Sistema de [dominio] esta [percentual ou avaliacao] funcional, mas com [n] problemas identificados:

- 🔴 [n] Criticos, [descricao curta]
- 🟡 [n] Moderados, [descricao curta]
- 🟢 [n] Menores, [descricao curta]

**Conclusao:** [conclusao objetiva]

---

## 🔴 Problemas Criticos

### 1. [Titulo]

**Problema:** [descricao]

**Localizacao:** `[arquivo]` > `[funcao]`

**Impacto:**

- ❌ [impacto]
- ❌ [impacto]

**Solucao Necessaria:**

1. [acao]
2. [acao]
3. [acao]

---

## 🟡 Problemas Moderados

### [n]. [Titulo]

**Problema:** [descricao]

**Impacto:**

- ⚠️ [impacto]

**Solucao Necessaria:**

1. [acao]

---

## 🟢 Problemas Menores

### [n]. [Titulo]

**Problema:** [descricao]

**Impacto:**

- 🟢 [impacto]

**Solucao Necessaria:**

1. [acao]

---

## ✅ O Que Esta Bem

| Item | Status | Evidencia |
|------|--------|-----------|
| [item] | ✅ | [evidencia] |

---

## 📊 Matriz de Risco

| Problema | Severidade | Probabilidade | Risco | Esforco |
|----------|------------|---------------|-------|---------|
| [problema] | Alto | Alta | CRITICO | 1h |

---

## 🎯 Ordem de Fixacao

### Fase 1: Criticos ([tempo])

1. T1: [task]
2. T2: [task]

### Fase 2: Robustez ([tempo])

3. T3: [task]

### Fase 3: Melhorias ([tempo])

4. T4: [task]

**Total Estimado:** [tempo]

---

## 📝 Proximos Passos

1. ✅ Revisar este DIAGNOSTIC.md
2. ⬜ Ler CONTEXT.md
3. ⬜ Ler TASKS.md
4. ⬜ Executar tasks

---

**Status:** [status final]
```

## Template: TASKS.md

Use este template:

```md
# Tasks: PRD-XXX [Dominio] Implementation

**Data:** YYYY-MM-DD | **Status:** [status] | **Total Tasks:** [n] | **Estimado:** [tempo]

---

## 🔴 Fase 1: Criticos ([tempo])

### T1: [Titulo] ([tempo])

**Problema:** [problema]

**Localizacao:** `[arquivo]` > `[funcao]`

**O que fazer:**

```typescript
// snippet curto se ajudar
```

**Aceitacao:**

- [ ] [criterio]
- [ ] [criterio]
- [ ] [criterio]

**Como testar:**

```bash
[comando ou cenario]
```

**Tempo:** [tempo]

---

## 🟡 Fase 2: Robustez ([tempo])

### T[n]: [Titulo] ([tempo])

**Problema:** [problema]

**Localizacao:** `[arquivo]`

**O que fazer:**

1. [acao]
2. [acao]

**Aceitacao:**

- [ ] [criterio]

**Tempo:** [tempo]

---

## 🟢 Fase 3: Melhorias ([tempo])

### T[n]: [Titulo] ([tempo])

**O que fazer:** [descricao]

**Aceitacao:**

- [ ] [criterio]

---

## 📊 Resumo

| Task | Tempo | Bloqueador |
|------|-------|------------|
| T1 | 1h | Nenhum |

**Total:** [tempo]

---

**Status:** [status final]
```

## Template: QUICK_START.md

Use este template:

```md
# Quick Start: PRD-XXX [Dominio]

**TL;DR:** [resumo em 1 ou 2 frases]. [n] problemas: [n] criticos, [n] moderados, [n] menores. Total: [tempo].

---

## 📊 Resumo dos Problemas

| # | Problema | Severidade | Fix |
|---|----------|------------|-----|
| T1 | [problema] | 🔴 Critico | [fix] |

---

## 🔴 Criticos

### T1: [Titulo]

**Como testar:**

```bash
[cenario]
# Esperado: [resultado]
```

---

## 📂 Arquivos Principais

- `[arquivo]` - [papel]
- `[arquivo]` - [papel]

---

## 🚀 Comecar

```bash
git checkout -b feature/[slug]
[pnpm/npm/yarn] test

# T1: [task]
# T2: [task]

git commit -m "feat([domain]): [mensagem]"
```

---

**Status:** [status]
```

## Padrao de escrita

Use frases diretas.

Prefira:

```txt
Problema: token expirado ainda permite acesso.
Impacto: paciente consegue preencher formulario invalido.
Solucao: validar expires_at antes de retornar dados.
```

Evite:

```txt
Talvez seja interessante avaliar se em alguns casos seria melhor considerar algum tipo de verificacao adicional.
```

## Snippets de codigo

Inclua snippets apenas quando ajudarem a tornar a task executavel.

Regras:

1. Snippets devem ser pequenos.
2. Snippets devem mostrar a intencao, nao uma implementacao final enorme.
3. Nao criar codigo inventado como se fosse arquivo real.
4. Se a localizacao for presumida, escrever `(presumido)`.
5. Usar TypeScript quando o projeto for Next.js ou Node.js com TypeScript.

## Criterios de aceitacao

Toda task deve ter criterios testaveis.

Bom:

```md
**Aceitacao:**

- [ ] Acessar item valido retorna 200
- [ ] Acessar item expirado retorna 403
- [ ] Log registra tentativa negada
```

Ruim:

```md
**Aceitacao:**

- [ ] Funciona bem
```

## Como lidar com incertezas

Se alguma informacao nao estiver disponivel, nao inventar.

Use:

```txt
A confirmar: [informacao]
Presumido: [hipotese]
Nao encontrado: [arquivo ou fluxo]
```

Exemplo:

```md
**Localizacao:** `src/app/api/workflows/[slug]/route.ts` (presumido)
```

## Checklist final do PRD

Antes de finalizar, conferir:

- [ ] A pasta segue `PRD-XXX-feature-slug`.
- [ ] README.md existe.
- [ ] CONTEXT.md existe.
- [ ] DIAGNOSTIC.md existe.
- [ ] TASKS.md existe.
- [ ] QUICK_START.md existe.
- [ ] O README resume o pacote inteiro.
- [ ] CONTEXT explica o dominio sem depender das tasks.
- [ ] DIAGNOSTIC lista problemas por severidade.
- [ ] TASKS transforma cada problema em acao executavel.
- [ ] QUICK_START permite comecar em poucos minutos.
- [ ] Todas as tasks tem aceitacao.
- [ ] Problemas criticos aparecem antes de moderados e menores.
- [ ] Matriz de risco existe.
- [ ] Arquivos principais foram listados.
- [ ] Incertezas foram marcadas como presumidas ou a confirmar.
- [ ] Nenhum codigo foi implementado como parte do PRD.

## Quando tambem usar outras skills

Se o PRD for para projeto Next.js com arquitetura por features, tambem considerar a skill:

```txt
$next-feature-architecture
```

Use a skill de arquitetura para interpretar camadas como:

```txt
app/api
features
services
repositories
schemas
queries
mutations
server/db
```

Esta skill continua responsavel apenas por gerar o pacote de PRD.
