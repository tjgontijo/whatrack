# QUICK START — PRD-016

## Smoke Test (após implementação)

1. Abrir `/settings/whatsapp/[phoneId]`
2. Verificar:
   - [ ] Header mostra: flag, número formatado, nome verificado, status badge, quality badge
   - [ ] Seção de perfil carrega foto + about + categoria do número específico (não do primeiro da org)
   - [ ] Seção de templates mostra lista com status badges
   - [ ] Botão "Enviar Teste" abre sheet lateral
   - [ ] Sheet: selecionar template APPROVED + inserir número → enviar → toast de sucesso

## Validação de segurança
- [ ] Acessar com org que tem 2 instâncias → cada uma mostra seu próprio perfil
- [ ] URL de instância de outro projeto → "Instância não encontrada"

## Notas de Implementação

- `phone.id` é o Meta Phone ID (ex: `1036641616191983`) — usado para chamar `getBusinessProfile`
- `phone.configId` é o UUID interno — usado nas URLs e queries do DB
- O endpoint `/api/v1/whatsapp/phone-numbers/[phoneId]/profile` recebe o Meta Phone ID como parâmetro de rota
- Validar no backend que o `phoneId` (Meta ID) pertence a um `WhatsAppConfig` da org antes de chamar a Meta API
