---
name: nextjs-execution-guardrails
description: Entregar tarefas neste projeto Next.js + TypeScript + Prisma com qualidade previsivel e baixa supervisao. Usar quando implementar feature, corrigir bug, criar ou alterar endpoint, refatorar modulos, ajustar validacoes, ou escrever testes em `src/` para manter padroes de arquitetura, regras de codigo e workflow de entrega.
---

# Next.js Execution Guardrails

Executar tarefas com processo consistente e baixo retrabalho.

## Fluxo Obrigatorio

1. Ler `references/rules.md` antes de editar qualquer arquivo.
2. Ler `references/directory-map.md` para localizar onde criar ou editar arquivos.
3. Ler apenas os blocos relevantes de `references/workflows.md` conforme o tipo da tarefa.
4. Mapear arquivos impactados e planejar diff minimo.
5. Implementar seguindo as regras desta skill.
6. Validar com comandos proporcionais ao impacto.
7. Responder com resumo objetivo, arquivos alterados, validacoes executadas e riscos pendentes.

## Selecao de Workflow

- Feature nova: usar `workflows.md` -> "Workflow: Nova Feature".
- Correcao de bug: usar `workflows.md` -> "Workflow: Bugfix".
- Endpoint/API: usar `workflows.md` -> "Workflow: Endpoint/API".
- Mudanca de schema Prisma: usar `workflows.md` -> "Workflow: Prisma e Dados".
- Refatoracao: usar `workflows.md` -> "Workflow: Refactor Seguro".

## Criterio de Conclusao

Concluir somente quando:

- Regras tecnicas foram seguidas.
- Nenhuma logica de negocio, query Prisma ou schema Zod foi adicionado dentro de uma route.
- Regras compartilhadas entre dominios foram centralizadas em modulo neutro (sem alias entre dominios).
- Nao restaram arquivos obsoletos, codigo morto ou diretorios vazios apos o refactor.
- Existe teste novo ou atualizado para o comportamento alterado.
- O teste criado/atualizado foi executado antes da entrega e o comando foi reportado no resumo final.
- Nao existem TODOs temporarios sem alinhamento.
- Resultado final permite review sem instrucoes adicionais.
