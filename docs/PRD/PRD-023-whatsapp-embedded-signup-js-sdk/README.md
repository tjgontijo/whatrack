# PRD-023: WhatsApp Embedded Signup (JS SDK)

## Problema

O método de autenticação da Meta atualmente implementado no WhaTrack baseia-se no **Server-Side OAuth Redirect** (`https://www.facebook.com/dialog/oauth`). 
Esse método possui uma limitação arquitetural fatal no contexto do WhaTrack: quando o cliente autoriza a conexão da sua WABA na Meta (seja no fluxo padrão ou de coexistência via QR code), o nosso servidor recebe **apenas um código cego** (`code`).

Se o usuário concede permissão em Nível de WABA (Ex: clicando em "Continuar com Todas as Minhas Contas" na Meta), essa chave nos dá acesso a **todos os telefones** vinculados àquela pessoa. Como a Meta *não envia* no URL Reverse State o ID específico do número que o cliente acabou de criar/ler no QR Code, nosso back-end obrigatoriamente roda um loop nas WABAs e importa "todos os telefones da base" do cliente de uma só vez para o mesmo projeto, enchendo o dashboard do cliente de instâncias indesejadas (10 números importados de uma vez, por exemplo).

## Solução

A única forma fornecida pela Meta de registrar 100% de qual foi o número **criado ou lido no QR Code** no exato milissegundo em que o Onboarding foi concluído é utilizando o **Facebook SDK para Javascript (`FB.login`)** no momento do clique, em substituição ao redirecionamento puro de navegador.

Com o JS SDK injetado na aplicação React (Frontend), o popup oficial da Meta é aberto sem o cliente sair da URL atual. Ao ser concluído, o próprio script da Meta deposita no navegador um JSON de resposta que contém:
- `code`: o token de OAuth normal.
- `setup_method`: Metodologia da conexão ("embedded").
- `phone_number_ids`: Matriz injetada dizendo exatamente o ID individual do Telefone alvo.

Nesse modelo, nós subimos no backend o ID específico (ex: `1504250230053270`) e o servidor blindado irá descartar todas as outras 9 conexões, importando fielmente a solitária agulha no palheiro que o seu cliente mirou.

## Objetivo
Refatorar a ponte de comunicação do Gateway de Onboarding para a modalidade Front-end Async JS. Acabar com as importações por "pesca de arrasto cega" (Global Fallback), deixando o Onboarding do WhaTrack preciso cirurgicamente ao número que leu o QR Code.

## Escopo

### IN
- Injetar carragamaneto assíncrono oficial do `connect.facebook.net/sdk.js` no WhaTrack.
- Inicializar `window.fbAsyncInit` global no React com o nosso `META_APP_ID`.
- Mudar `use-whatsapp-onboarding.ts` de um redirect de tela toda/nova guia para a abertura do `FB.login` Modal nativo da Meta.
- No frontend, capturar do modal os sub-campos de `authResponse` providos na resposta.
- Atualizar endpoint `/api/v1/whatsapp/onboarding/callback` (agora um endpoint local API comum sendo consumido via React Mutation/Fetch) e não pelo navegador via GET callback HTTP.
- Receber do frontend o `code` e os eventuais `phone_number_ids`.
- Se o backend receber `phone_number_ids`, garantir que *nenhum outro telefone além dos passados no ARRAY* caia no banco de dados.

### OUT
- Alterar as travas do `meta-cloud.service.ts` recentemente implementadas contra furtos entre Projetos (continuará válida caso o usuário falhe em alguma permissão no futuro).
- Mudanças nos blocos HTML atuais da URL da Meta Ads Settings (esse ticket afeta estritamente o WhatsApp Embedded Signup).
