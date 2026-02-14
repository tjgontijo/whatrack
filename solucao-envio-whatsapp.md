# Fala pessoal! / Hey everyone!

Já passamos exatamente por esse mesmo perrengue aqui. O comportamento é estranho mesmo: a Meta te dá `200 OK`, gera o `message_id`, mas a mensagem some no limbo. 

O **"pulo do gato"** é que o número precisa ser ativado via API, mesmo que ele já apareça como "Ativo" no painel da Meta. Se você não rodar esses dois comandos abaixo, a Meta aceita o envio mas descarta a mensagem na hora de rotear pro WhatsApp.

---

## 🇧🇷 Solução (Português)

Você precisa rodar dois POSTs rápidos (pode ser pelo Postman ou cURL):

1. **Registrar o número (Register)**
Isso "acorda" o seu `phone_number_id` nos servidores do WhatsApp.
- **POST** `https://graph.facebook.com/v24.0/{{PHONE_NUMBER_ID}}/register`
- **Body:** 
```json
{
  "messaging_product": "whatsapp",
  "pin": "123456"
}
```

2. **Assinar o App no seu WABA (Subscribed Apps)**
Isso vincula o seu App à conta Business de fato.
- **POST** `https://graph.facebook.com/v24.0/{{WABA_ID}}/subscribed_apps`
- *(Não precisa de body)*

> **Por que isso acontece?** Sem o registro, o número não existe na malha de entrega do WhatsApp. A API de mensagens valida o seu token e o JSON (por isso o 200 OK), mas na hora de entregar, ela vê que o "nó" do número não está pronto e descarta tudo silenciosamente.

---

## 🇺🇸 Solution (English)

We've been through this exact same headache. It’s frustrating because Meta returns `200 OK` and a `message_id`, but the message just vanishes.

The trick is that the number must be **programmatically activated**, even if it shows as "Active" in the Meta Dashboard. If you don't run these two commands, Meta accepts the payload but drops the message during routing.

1. **Register the number**
This actually "provisions" your `phone_number_id` on WhatsApp servers.
- **POST** `https://graph.facebook.com/v24.0/{{PHONE_NUMBER_ID}}/register`
- **Body:**
```json
{
  "messaging_product": "whatsapp",
  "pin": "123456"
}
```

2. **Subscribe the App to your WABA**
This links your FB App to the Business Account properly.
- **POST** `https://graph.facebook.com/v24.0/{{WABA_ID}}/subscribed_apps`
- *(No body needed)*

> **Why does this happen?** Without registration, the number doesn't exist in the WhatsApp delivery mesh. The Messages API validates your token and JSON (hence the 200 OK), but when it tries to route the message, it realizes the number's "node" isn't ready and silently discards it.

---
*Espero que ajude! / Hope this helps!*
