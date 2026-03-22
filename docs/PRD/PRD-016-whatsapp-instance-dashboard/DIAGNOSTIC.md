# DIAGNOSTIC — PRD-016

## Problemas Identificados

### P1 — Layout fragmentado (UX)
**Impacto:** Alto
**Causa:** `overview-view.tsx` usa hub cards que navegam para sub-páginas em vez de mostrar conteúdo.
**Fix:** Substituir hubs por seções de conteúdo real na mesma página.

### P2 — Bug no endpoint de perfil (Segurança/Corretude)
**Impacto:** Alto (multi-instância)
**Causa:** `GET /api/v1/whatsapp/business-profile` usa `MetaCloudService.getConfig(orgId)` que retorna o primeiro config da org — ignora o `phoneId` da instância atual.
**Fix:** Criar `GET /api/v1/whatsapp/phone-numbers/[phoneId]/profile` que recebe o `phoneId` (Meta ID) como parâmetro de rota e passa diretamente para `MetaCloudService.getBusinessProfile({ phoneId })`. Validar que o `phoneId` pertence à org via DB.

### P3 — `quality_rating` não exibido (UX)
**Impacto:** Médio
**Causa:** O campo existe no tipo mas não é mostrado na tela atual.
**Fix:** Exibir badge de qualidade no header (GREEN=verde, YELLOW=amarelo, RED=vermelho).

### P4 — Sheet de envio de teste não existe como sheet (UX)
**Impacto:** Médio
**Causa:** Envio de teste está em sub-página separada, não em sheet contextual.
**Fix:** Migrar `SendTestView` para um `Sheet` aberto por botão na página principal.

### P5 — Templates não visíveis sem navegar (UX)
**Impacto:** Médio
**Causa:** Templates só aparecem em `/[phoneId]/templates`.
**Fix:** Exibir lista de templates na página principal (read mode), com link para gerenciar na sub-página.

## Riscos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Meta API lenta para business-profile | Médio | Skeleton loading, staleTime 5min |
| Muitos templates → layout pesado | Baixo | Limitar a 10 na página principal + link "ver todos" |
| Sheet de envio complexo com variáveis | Médio | Começar simples, variáveis são opcionais |
| Sub-páginas duplicando lógica | Baixo | Reusar componentes, sub-páginas continuam existindo |
