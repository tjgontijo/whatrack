# Contexto do Problema (Server-Side Redirect Flow)

## Como acontece o Bug Visual de Poluição do Cliente
Hoje, o processo foi desenhado assim:

1. Cliente clica em "Conectar WhatsApp" -> URL leva ele para `facebook.com/dialog/oauth`.
2. O cliente lê o **QR Code** exclusivo de ONE telefone (Funcionalidade nova: Coexistence). 
3. Na tela de "Finalizar", a Meta, por padrão de conta, traz TODAS as Contas Empresariais (WABAs) que esse cliente tem. E o cliente não desmarca a concorrência porque só apertou "Continuar".
4. A Meta redireciona para a callback em nosso servidor, informando o código limpo.
5. Em nosso log `debug_token` no backend, a Meta informa:
```json
{
  "scope": "whatsapp_business_messaging",
  "target_ids": [
    "106193842038856", // Waba A
    "26205485689057417" // Waba B
  ]
}
```
*Note que a API da Meta **omite** via backend o ID do número de Coexistência escaneado e nos envia toda a família de contas das quais o cliente liberou permissão na etapa (3).*

6. O WhaTrack, de boa-fé, busca todos os números e salva 2 instâncias diferentes no painel, obrigando o usuário a "tentar descobrir por conta qual foi a que ele se conectou", e clicar no Desconectar Manual da intrusa (o que gera o erro infame SMB `Deregister endpoint is not available for API solution for SMB businesses` escondido em background).

## Pistas no Log que Provaram a Falta do JS SDK
Ao resetar o banco do zero no dia de testes (dia 24 de março by Thiago), notou-se o WhaTrack ressuscitando as instâncias indesejadas instantaneamente:

```txt
12:38:40.68  ℹ️  POST --- [Webhook] PARTNER_ADDED waba_id: "106193842038856" (NÃO CONTÉM PHONE_ID)
12:38:48.70  ℹ️  GET  --- [MetaCloudService] Fetching phone numbers for WABA 106193842038856
12:39:19.18  ℹ️  GET  --- [MetaCloudService] Fetching profile para numero INDESEJADO!
```
Enfim, mesmo acompanhando via backend Oauth Callback E Lendo Webhooks simultâneos que chegam no WhaTrack (`PARTNER_ADDED`), a Meta não insere no protocolo Server-to-Server Webhook o bendito ID que engatilhou aquele evento na UI.

Logo, a **Única Janela Lógica** por onde a Meta desce a informação milimétrica é diretamente no próprio navegador onde a mágica do pop-up e leitura do QR CODE se dá. Esse "Dedo Duro" só acontece via payload JS de `window.FB.login()`.

## Referências Arquiteturais da Meta

```javascript
// O que passará a Habitar no Front do WhaTrack usando FB.login(..., {config_id: "xyz"})
const response = window.FB.getAuthResponse();
// Exemplo real de resposta no navegador que nós NÃO temos hoje:
const setupMethod = response.setup_method; // 'embedded'
const wabaID = response.client_whatsapp_business_accounts[0]; // '106193842038856'
const phoneID = response.phone_number_ids[0]; // '1504250230053270' -> SALVA-VIDAS 🛟
```
