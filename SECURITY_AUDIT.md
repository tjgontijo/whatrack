# Auditoria de Segurança Detalhada - WHATRACK MVP

Para lançar um MVP com segurança, é necessário não apenas analisar superficialmente a organização do código, mas mergulhar nas rotas e na proteção da infraestrutura. A análise atual encontrou **falhas graves que podem resultar em Denial of Service (DoS), paralisação total do sistema (indisponibilidade de login) e vazamento de operações internas**.

Eis a análise detalhada, dividida por criticidade.

---

## 🛑 1. Riscos Críticos (Corrigir antes do lançamento)

### 1.1. Vulnerabilidade de DoS (Denial of Service) no Webhook do WhatsApp

**Onde:** `src/app/api/v1/whatsapp/webhook/route.ts`
**O problema:** O código atualmente lida com requisições POST do Meta extraindo o _payload_ e **inserindo-o diretamente no Banco de Dados** (via `prisma.whatsAppWebhookLog.create`) **ANTES** de verificar a assinatura de segurança da requisição (`verifyWebhookSignature`).

- **Riscos:** Qualquer pessoa no mundo pode enviar milhões de requisições com payloads massivos para a URL pública do seu Webhook. Como você salva no banco antes de validar a assinatura, um atacante pode estourar o limite de armazenamento do seu banco de dados em poucos minutos, causando inoperabilidade total (_Denial of Service_).
- **Como resolver:** A verificação de assinatura (`x-hub-signature-256`) **deve ser a primeira etapa**. Apenas payloads assinados legitimamente pelo Meta devem ser persistidos no banco.

### 1.2. Bypass de Segurança na Cron de Inteligência Artificial

**Onde:** `src/app/api/cron/ai-classifier/route.ts`
**O problema:** A rota implementa a seguinte lógica de verificação da cron:

```typescript
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) { ... bloqueia }
```

- **Riscos:** Se por algum motivo a variável de ambiente `CRON_SECRET` não for preenchida corretamente em Produção (Vercel), a condição do `if` será falsa e **a verificação será completamente ignorada**. Qualquer pessoa descobriria a rota e conseguiria executar a análise de IA à vontade, podendo esgotar os créditos da sua API da OpenAI/Groq rapidamente.
- **Como resolver:** A lógica deve ser Fail-Safe. Se não houver `cronSecret`, deve imediatamente retornar Erro 500 ou 401.

### 1.3. Quebra Total de Autenticação (Ninguém conseguirá logar)

**Onde:** `src/lib/auth/auth.ts`
**O problema:** O sistema de Magic Link e OTP de Login (Better Auth) está configurado apenas com `console.log` para o envio dos e-mails.

- **Riscos:** No ambiente de produção, quando o usuário tentar criar uma conta ou entrar pelo e-mail, o sistema não enviará para o Resend de fato. O código vai ficar retido nos logs do servidor e o usuário ficará travado aguardando um e-mail.
- **Como resolver:** Integrar obrigatoriamente as chamadas ao `resend.emails.send` nesta configuração.

---

## ⚠️ 2. Riscos Altos (Disrupção de Funcionalidades)

### 2.1. Cron Jobs Configuradas Incorretamente na Vercel

**Onde:** `vercel.json` e `src/app/api/v1/jobs/.../route.ts`
**O problema:** Você possui rotas configuradas no `vercel.json` para executar rotinas (ex: `whatsapp-health-check` e `webhook-retry`).

1. **Erro de Método**: A Vercel dispara as crons utilizando o método **GET**. Porém, nessas rotas API, seu método `GET` apenas retorna se o Job está rodando (Status). O Job real está no método **POST**. Portanto, as crons nunca vão executar de verdade, causando acúmulo de Dead Letter Queues (DLQ) no WhatsApp.
2. **Erro de Autenticação**: A Vercel envia automaticamente o Header `Authorization: Bearer <CRON_SECRET>`. Porém, as suas rotas aguardam o secret no _query parameter_ (`?secret=`) ou num header customizado chamado `x-cron-secret`. Isso resultaria invariavelmente em Erro 401 (Unauthorized).

- **Como resolver:** Mover a lógica de execução para o `GET` nestas rotas (ou usar a estrutura oficial do Next.js App Router para crons, validando via `request.headers.get('authorization')`).

---

## 🟠 3. Riscos Médios (Abuso de Recursos)

### 3.1. Abuso Sem Restrições (Rate Limit) na API ReceitaWS

**Onde:** `src/app/api/v1/company/lookup-public/route.ts`
**O problema:** Esta é uma API pública usada na tela de Onboarding para preencher dados via CNPJ (`fetchCnpjData`).

- **Riscos:** Apesar do sistema possuir um sistema de Rate Limit robusto (`rateLimitMiddleware`), ele **não foi associado** à essa rota! Um bot malicioso pode disparar 10.000 requisições seguidas para essa rota, o que irá bloquear o seu acesso IP à ReceitaWS para o resto do dia.
- **Como resolver:** Basta chamar a função `await rateLimitMiddleware(request, '/api/v1/company/lookup-public')` no topo do arquivo.

### 3.2. Falta de um Middleware Central

**Onde:** (Estrutural)
**O problema:** Embora as rotas testadas validem diretamente na função `GET/POST` usando `validateFullAccess`, ou em propriedades de `layout.tsx`, esquecer de colocar essa linha numa rota nova cria imediatamente uma brecha de vazamento de dados.

- **Como resolver:** (Pode não ser para este exato momento) A arquitetura Next.js App Router baseia grande parte da segurança num arquivo raiz `src/middleware.ts` bloqueando páginas e APIs por padrão (padrão whitelist contra blacklist).

---

## Resumo do Plano de Ação

Como engenheiro autônomo, caso você me autorize, posso iniciar as correções listadas abaixo imediatamente, começando pelos problemas Críticos (1) e Altos (2):

1. Reverter a lógica do **WhatsApp Webhook** para Validar a Assinatura antes do Log no BD.
2. Adicionar o **Rate Limit** na rota do Lookup Público do CNPJ.
3. Fixar a verificação cega do `CRON_SECRET` da Inteligência Artificial.
4. Adaptar as rotas da Cron Jobs do Vercel para responderem corretamente com os headers que a Vercel envia e executarem efetivamente as funções.

Me diga se deseja que eu já comece a aplicar as melhorias e crie os PRs/commits na mesma hora.
