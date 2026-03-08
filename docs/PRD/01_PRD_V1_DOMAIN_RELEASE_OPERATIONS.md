# PRD V1 Domain: Release Operations

## Objetivo

Fechar a superfície pública, revisar operação de produção e executar o checklist final para abrir a V1 amanhã com risco controlado.

## Estado Implementado Hoje

Base já existente no código:

- `src/proxy.ts` já foi endurecido para triagem defensiva
- o webhook de billing já valida assinatura sem logar material sensível
- `next.config.ts` já possui baseline melhor de headers de segurança
- o projeto está convergindo os gatilhos agendados para `/api/v1/cron/[domain]/[function]`

## Problema Real

O produto já existe, mas a superfície de produção ainda mistura feature oficial com rota auxiliar, rota de debug e documentação histórica inconsistente.

## Escopo Oficial da V1

Entra no esforço de hoje:

- remover ou esconder superfície interna desnecessária
- alinhar documentação operacional com o comportamento atual
- validar jobs, envs, webhooks e segredos
- consolidar `n8n` como scheduler oficial da V1
- executar smoke manual de launch

## Superfície Cortada Nesta Fase

Rotas removidas nesta primeira passada do `PRD 00`:

- `/api/v1/test/publish-message`
- `/api/v1/health/redis`
- `GET /api/v1/whatsapp/history-sync-alerts`
- `/api/v1/debug`
- `/api/v1/debug/auth`
- `/api/v1/billing/debug`
- `/api/v1/billing/test`

Resultado:

- removidas do launch V1
- tratadas como superfície morta de desenvolvimento

## Tarefas de Hoje

1. Revisar e cortar endpoints que não precisam existir no launch.
2. Confirmar quais jobs oficiais precisam rodar amanhã e quais serão chamados pelo `n8n`.
3. Alinhar docs de billing, WhatsApp, IA e scheduling com o comportamento real do sistema.
4. Montar checklist curta de produção com secrets, webhooks, contas conectadas e scheduler externo.
5. Rodar smoke manual completo:
   - `landing -> cadastro/login -> organização -> billing`
   - `WhatsApp -> mensagem -> lead/ticket`
   - `IA -> sugestão -> aprovação -> venda`
   - `Meta Ads -> leitura de campanha -> sinal de conversão`

## Critérios de Aceite

- nenhuma rota de debug/teste fica exposta sem decisão consciente
- todos os jobs e webhooks oficiais estão configurados
- o `n8n` está assumido como scheduler oficial e validado
- a documentação operacional cabe em uma leitura rápida do time
- smoke manual completo foi executado e registrado
- existe decisão explícita de `go` ou `no-go` para amanhã

## Riscos de Launch

- superfície interna exposta aumenta risco sem adicionar valor ao cliente
- docs contraditórias fazem a operação errar configuração no pior momento
- ambiguidade entre scheduler antigo e `n8n` aumenta risco operacional
- sem smoke final, o launch vira aposta em vez de execução
