# PRD V1 Domain: WhatsApp

## Objetivo

Permitir conectar a operação de WhatsApp, receber mensagens, acompanhar conversas e sustentar a base de dados usada pelo restante do produto.

## Estado Implementado Hoje

Base já existente no código:

- onboarding em `src/app/api/v1/whatsapp/onboarding/route.ts`
- serviço de onboarding em `src/services/whatsapp/whatsapp-onboarding.service.ts`
- webhook em `src/app/api/v1/whatsapp/webhook/route.ts`
- inbox em `src/app/dashboard/whatsapp/inbox`
- configurações em `src/app/dashboard/settings/whatsapp/page.tsx`
- envio de template, account, business profile, token health e outras rotas em `src/app/api/v1/whatsapp`
- handler de mensagens em `src/services/whatsapp/handlers/message.handler.ts`

## Escopo Oficial da V1

Entra no launch:

- conectar conta WhatsApp Business
- receber mensagens novas
- acompanhar inbox
- manter dados de conversas e leads atualizados
- permitir operação básica de templates e configuração

Fica fora do esforço de hoje:

- features secundárias sem uso comprovado no dia 1
- superfícies internas de monitoramento que não são necessárias para cliente

## Gaps Reais

- falta validar onboarding real com conta de produção ou sandbox equivalente
- falta validar webhook de ponta a ponta com mensagem real recebida
- existe superfície auxiliar que parece resíduo de desenvolvimento e precisa de corte ou revisão
- qualquer rotina operacional recorrente de WhatsApp que ficar na V1 deve estar explicitamente ligada ao `n8n`

## Tarefas de Hoje

1. Validar conexão completa do WhatsApp no ambiente de release.
2. Validar webhook com mensagem real chegando no sistema.
3. Validar que a conversa aparece no inbox com lead e ticket consistentes.
4. Revisar endpoints auxiliares e remover o que não é necessário para produção.
5. Confirmar token, verify token, credenciais do provedor e rotina operacional chamada pelo `n8n`, se existir.

## Critérios de Aceite

- conta conecta sem intervenção manual fora do fluxo esperado
- webhook recebe mensagem real e atualiza a conversa
- inbox mostra a operação real sem erro bloqueante
- nenhuma rota interna desnecessária fica exposta na superfície pública

## Riscos de Launch

- se WhatsApp falhar, o produto perde o núcleo operacional
- qualquer inconsistência entre webhook, conversa e lead compromete IA e CRM ao mesmo tempo
