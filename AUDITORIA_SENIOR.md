# Auditoria de Sistema Next.js - WHATRACK (Senior Developer Review)

## 📋 Resumo Executivo
O sistema apresenta uma arquitetura funcional baseada em Next.js 16/19, Prisma e Better Auth. No entanto, para um lançamento de MVP, existem pontos críticos de **segurança** e **organização** que precisam ser endereçados para garantir a escalabilidade e a manutenção do código.

---

## 1. Organização e Estrutura de Pastas 📂

### ⚠️ Mistura de Responsabilidades (Lib vs Service)
Identificamos que arquivos de infraestrutura/bibliotecas estão localizados na pasta `services`. Conforme solicitado, estes devem ser movidos para a `lib` para diferenciar **regras de negócio** (Services) de **configurações/wrappers** (Lib).

*   **`src/services/mail/resend.ts`**: Deve ser movido para `src/lib/mail/resend.ts`. É um wrapper da biblioteca externa.
*   **`src/services/company/receitaws.ts`**: Deve ser movido para `src/lib/external/receitaws.ts`. É um client de API externa.
*   **`src/services/whatsapp/cache.service.ts`**: Geralmente é um wrapper de Redis/Cache, deveria estar em `src/lib/cache/`.

### 🏗️ Lógica de Dados em Camadas Incorretas
Muitos componentes e rotas API estão fazendo chamadas diretas ao Prisma.
*   **Exemplo Crítico**: `src/app/api/v1/tickets/route.ts` possui 527 linhas. Toda a lógica de construção de filtros Prisma, cálculos de data e transações deve ser movida para um `TicketService`.
*   **Layouts**: `src/app/dashboard/layout.tsx` realiza buscas no banco diretamente. Idealmente, deveria usar um service para centralizar a lógica de "Organization Access".

---

## 2. Segurança e Riscos Críticos 🔐

### 🔴 Falha na Proteção de Cron Jobs
No arquivo `src/app/api/cron/ai-classifier/route.ts`:
```typescript
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) { ... }
```
Se a variável `CRON_SECRET` não estiver setada, o código pula a verificação, expondo o endpoint.
*   **Correção**: Forçar a falha caso o secret não exista.

### 🔴 Autenticação Incompleta (High Risk)
No arquivo `src/lib/auth/auth.ts`, os provedores de Magic Link e OTP apenas fazem `console.log`.
*   **Impacto**: Usuários não conseguirão entrar ou verificar emails em ambiente de produção se as chamadas reais aos serviços de email (Resend) não forem integradas antes do lançamento.

### 🟡 Exposição de Endpoint Público sem Rate Limit
`api/v1/company/lookup-public`: Este endpoint permite consulta de CNPJ sem autenticação (necessário para onboarding).
*   **Vulnerabilidade**: Pode ser abusado por bots para consumir sua cota da API ReceitaWS.
*   **Correção**: Implementar rate limit por IP neste endpoint.

### 🟡 Middleware Global
Não encontramos um `middleware.ts` na raiz do projeto. Embora a proteção no `DashboardLayout` e nas APIs funcione, um middleware centralizado é a forma mais segura de garantir que nenhuma rota nova seja esquecida sem proteção.

---

## 3. Débito Técnico e Refatoração 🧹

### 📄 Componentes "Gordos" (Fat Components)
Arquivos que concentram muita lógica de formatação e UI:
*   **`src/components/whatsapp/settings/webhooks-view.tsx` (607 linhas)**: 
    *   Extrair os formatadores (`translateStatus`, `formatPhoneNumber`, etc.) para `src/helpers/whatsapp.ts`.
    *   Dividir as abas "Overview" e "Logs" em sub-componentes.
*   **`src/schemas/sign-up.ts`**: Contém muitos arrays de constantes para selects do formulário. Mover estas opções para `src/lib/constants/onboarding.ts`.

### 🛠️ Hardcoded Values
No `WebhooksView`, a URL do webhook está chumbada:
```typescript
const webhookUrl = "https://whatrack.com/api/v1/whatsapp/webhook"
```
Isso dificulta o uso em ambientes de staging ou local. Deve usar a variável `NEXT_PUBLIC_APP_URL`.

---

## 4. Recomendações Prioritárias (Checklist Pré-Lançamento) ✅

1.  **[URGENTE]** Integrar Resend no `src/lib/auth/auth.ts` para envio real de emails.
2.  **[SEGURANÇA]** Corrigir a validação de `CRON_SECRET` para ser restritiva.
3.  **[REORGANIZAÇÃO]** Mover wrappers de API externa (`resend`, `receitaws`) de `services` para `lib`.
4.  **[PERFORMANCE]** Adicionar Rate Limit no endpoint público de consulta de CNPJ.
5.  **[MAINTENANCE]** Refatorar `api/v1/tickets/route.ts` movendo a lógica para `src/services/tickets/ticket.service.ts`.

---
**Análise Final**: O sistema está bem encaminhado, com escolhas tecnológicas sólidas (Next.js + Prisma + Better Auth). O foco agora deve ser na centralização da lógica de dados (Services) e no fechamento das brechas de segurança citadas para um lançamento seguro.
