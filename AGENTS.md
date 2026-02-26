## Skills

### Available skills

- nextjs-execution-guardrails: Skill para executar tarefas neste projeto Next.js com regras claras de arquitetura, qualidade e validacao. Use para features, bugfixes, API, Prisma, refactors e testes. (file: /Users/thiago/www/whatrack/docs/SKILL/nextjs-execution-guardrails/SKILL.md)

### How to use skills

- Trigger: Se o pedido envolve codigo em `src/`, ativar `nextjs-execution-guardrails`.
- Ordem de leitura obrigatoria:
1. Ler `docs/SKILL/nextjs-execution-guardrails/SKILL.md`.
2. Ler `docs/SKILL/nextjs-execution-guardrails/references/rules.md`.
3. Ler `docs/SKILL/nextjs-execution-guardrails/references/directory-map.md`.
4. Ler apenas os blocos relevantes de `docs/SKILL/nextjs-execution-guardrails/references/workflows.md`.
- Execucao obrigatoria: implementar com diff minimo e manter padroes existentes.
- Convencao Next.js 16 obrigatoria: usar `src/proxy.ts` para interceptacao de requests e nunca criar `src/middleware.ts`.
- Validacao obrigatoria: rodar checks proporcionais ao impacto antes de concluir.
- Entrega final obrigatoria: listar arquivos alterados, validacoes executadas e riscos pendentes.
