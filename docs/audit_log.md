Boa pergunta. Vou te responder como **um PRD de verdade (nível produto + engenharia)**, não só técnico. A ideia é você conseguir entregar isso para time, CTO ou até implementar sozinho com clareza.

---

# 📄 PRD

## Sistema de Auditoria para Plataforma Next.js

---

# 1. Visão Geral

### Objetivo

Implementar um sistema de auditoria confiável, performático e escalável capaz de registrar ações críticas realizadas por usuários e pelo sistema, garantindo:

* rastreabilidade completa
* suporte a compliance (LGPD, SOC2, ISO)
* investigação de incidentes
* debugging avançado.

---

### Escopo

O sistema deve auditar:

* alterações em dados críticos
* autenticação e autorização
* operações administrativas
* ações automatizadas do sistema.

---

# 2. Stack Técnica

### Backend

* Next.js App Router (Route Handlers / Server Actions)
* Node.js runtime.

### Logging

* Pino (structured logging).

### ORM

* Prisma.

### Banco

* PostgreSQL.

---

# 3. Arquitetura

Fluxo:

```
Request
↓
Next Route Handler / Server Action
↓
Prisma Middleware
↓
Audit Service
↓
Audit Table (Postgres)
+
Pino Log Stream
```

Separação:

* Prisma Middleware → captura mudanças DB.
* Service Layer → eventos de negócio.
* Pino → observabilidade e debug.

---

# 4. Requisitos Funcionais

## RF01. Auditoria CRUD

O sistema deve registrar automaticamente:

* CREATE
* UPDATE
* DELETE.

Campos obrigatórios:

* model afetado
* registro ID
* usuário executor.

---

## RF02. Auditoria de Autenticação

Registrar:

* login sucesso
* login falha
* logout
* reset senha.

---

## RF03. Auditoria Admin

Registrar ações administrativas:

* alteração permissões
* exclusão usuário
* mudanças configurações.

---

## RF04. Contexto da Ação

Toda auditoria deve incluir:

* actorId (quem executou)
* tenantId (multi tenant)
* IP
* user agent
* rota.

---

## RF05. Diferença de Dados (Diff)

UPDATE deve armazenar:

* before
* after.

Exemplo:

```json
{
 "before": {
   "role": "user"
 },
 "after": {
   "role": "admin"
 }
}
```

---

# 5. Requisitos Não Funcionais

---

## RNF01 Performance

Auditoria não deve bloquear request.

Meta:

* impacto < 5ms por operação.

Estratégia:

* async write.

---

## RNF02 Escalabilidade

Suportar:

* mínimo 10 milhões eventos.

Estratégias:

* índices.
* particionamento mensal.

---

## RNF03 Imutabilidade

Audit log não pode ser editado.

Somente:

* INSERT.

Nenhum UPDATE permitido.

---

## RNF04 Segurança

Dados sensíveis devem ser mascarados:

* password
* tokens
* CPF.

---

# 6. Modelagem de Dados

Tabela:

```sql
audit_events
```

Campos:

```sql
id uuid pk
timestamp timestamptz

actor_id uuid nullable
tenant_id uuid nullable

entity varchar
entity_id varchar

action varchar

before jsonb
after jsonb

metadata jsonb

ip varchar
user_agent text

request_id varchar
```

---

## Índices

```sql
actor_id
entity
timestamp DESC
tenant_id
```

---

# 7. Prisma Middleware

Interceptar:

* create
* update
* delete.

Pseudo:

```ts
prisma.$use(async (params, next) => {

 const before =
   params.action === "update"
   ? await prisma[params.model].findUnique()
   : null;

 const result = await next(params);

 await auditService.log({
   action: params.action,
   model: params.model,
   before,
   after: result
 });

 return result;
});
```

---

# 8. Logging Estruturado

Pino deve registrar:

* erro auditoria
* eventos críticos.

Exemplo:

```ts
logger.info({
 action: "USER_DELETED",
 actorId,
 entityId
});
```

Logs enviados para:

* Loki
* Elastic
* ou BetterStack.

---

# 9. API Interna

Service:

```ts
audit.log({
 action,
 entity,
 actor,
 metadata
});
```

Uso manual para eventos business.

Ex:

```ts
audit.log({
 action:"INVOICE_SENT"
});
```

---

# 10. Retenção

Definir política:

* 90 dias quente.
* arquivamento S3 após.

---

# 11. Monitoramento

Alertas quando:

* exclusões massivas.
* falhas login > X.

---

# 12. Métricas de Sucesso

* 100% operações CRUD auditadas.
* Latência adicional <5%.
* Nenhum evento perdido.

---

# 13. Riscos

* alto volume writes.
* custo storage.

Mitigação:

* compressão JSONB.
* partitions.

---

# ⭐ (Extra) Recomendação Senior

Adicionar:

* requestId propagado via AsyncLocalStorage.

Isso permite:

* correlacionar logs Pino + auditoria + erro.

Nível Stripe/Uber.


