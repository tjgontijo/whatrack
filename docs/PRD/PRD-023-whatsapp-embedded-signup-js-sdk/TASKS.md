# Tasks

## 1. Módulo "Facebook SDK Injector" no WhaTrack
- **Objetivo**: Criar utilitário no frontend para injetar `connect.facebook.net/sdk.js` da forma que um SPA do React demanda.
- **Ação**: Criar um arquivo/hook `use-facebook-sdk.ts` ou similar contendo uma verificação global (singleton) de inicialização e a promessa de carregar o core script de forma assíncrona com `window.fbAsyncInit` contendo o `NEXT_PUBLIC_META_APP_ID`, API Version `v25.0`.

## 2. Refatoração de `useWhatsAppOnboarding` (Migração Redirect -> JS Async)
- **Objetivo**: O botão de onboarding do WhaTrack hoje faz `window.open(url_do_backend, '_blank')`. Ele deve passar a chamar localmente `FB.login`.
- **Mudança Tática**: 
  - Ao invés do Backend montar de forma burra a `oauth` URL no endpoint, ele pode no máximo nos retornar a feature flag/tracking code se preciso.
  - O fluxo principal vai ser: A página clica no botão, executa internamente `FB.login(callback, {config_id: MetaEmbbededConfigId, response_type: 'code', extras: "..." })`.
  - A callback de promessa recebe a `authResponse`. E o objeto `authResponse` provará sua utilidade passando `phone_number_ids` isolados!

## 3. Conversão Completa do Callback (Backend)
- **Objetivo**: O atual `route.ts` de GET `/api/v1/whatsapp/onboarding/callback` existe para recepcionar o POST da URL Redirect do Facebook (via navegação GET) e fazer um ping-pong da sessão com cookies. Precisamos transformar isso numa rota de infraestrutura que o frontend consumirá via POST fetch.
- **Payload Novo**: O frontend manda para o backend (API nova de post):
  - `code`: string de autorização curta da Meta.
  - `phone_number_ids`: string[]. Recebido nativamente pelo JS SDK.
  - `tracking_code/state`: o identificador de org/project do WhaTrack.
- **Reflexo na `whatsapp-onboarding.service.ts`**: Agora o backend tem o array exatíssimo das instâncias desejadas! 
  - Ao iterar nos telefones da(s) WABA(s), se bater com o Target_IDs original, ignoramos. A NOVA REGRA de ouro será: *Filtre impiedosamente a lista de telefones da Meta localmente usando o ARRAY mandado pelo Frontend (que diz expressamente: "SÓ O NUMERO DO QR CODE IMPORTA")*.

## 4. Remoção de Sujeiras e UX
- **Objetivo**: Limpar mecanismos de Storage e pollock messages entre pop-up de abas que eram necessárias na gambiarra de redirect de guia anônima.
- O novo SDK faz sobreposição por conta com `<iframe>` ou popup inteligente. Ao ter sucesso do POST pro backend, um toast no callback JS puro dá "Sucesso" na mesma aba, e dispara a recarga de state. Tudo se mantém com o React query.
