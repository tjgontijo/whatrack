# Quick Start: PRD-001 WhatsApp Disparo em Massa via API Oficial

## Leitura Recomendada

1. `README.md`
2. `CONTEXT.md`
3. `DIAGNOSTIC.md`
4. `TASKS.md`

## Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/2026-03-19-whatsapp-disparo-em-massa
```

## Primeiro Commit

```bash
git add docs/PRD/PRD-001-whatsapp-disparo-em-massa/
git commit -m "docs: add PRD for whatsapp disparo em massa"
```

## Ordem de Execucao

1. Modelagem Prisma e schemas do dominio
2. Servicos de campanha, audiencia e execucao
3. Rotas de API e cron de disparo
4. UI de dashboard
5. Atribuicao de resposta e validacao final

## Verificacao

- `npx prisma validate`
- `npm test`
- `npm run build`
- fluxo manual de criacao, aprovacao, agendamento, disparo e resposta

## Premissas da V1

- Apenas templates aprovados pela Meta
- Sem distribuicao automatica entre instancias
- Sem mensagem livre
- Sem analytics avancado
- Sem conversao automatica de importados em lead no momento da importacao

## Otimizacoes Planejadas Para Depois

- distribuicao automatica entre instancias
- analytics e dashboard de performance mais ricos
- retry operacional com controles mais finos
- automacoes e jornadas
- regras avancadas de aprovacao
- opcao de promover importados para lead por configuracao
