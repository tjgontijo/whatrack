# ✅ Production Deployment Checklist: WhatsApp Onboarding v2

**Antes de fazer qualquer deploy para produção, complete este checklist.**

---

## 🔴 CRÍTICO (Não deploy sem isto)

### Database
- [ ] Todas as 4 migrations rodadas com sucesso
- [ ] Índices criados: `whatsapp_onboarding_expiresAt_idx`, `whatsapp_connections_organizationId_idx`, etc
- [ ] Schema Prisma atualizado com enums e relações
- [ ] Prisma generate rodado

### Token Encryption
- [ ] TOKEN_ENCRYPTION_KEY gerada (64-char hex)
- [ ] Testado: encrypt + decrypt funcionando
- [ ] Chave rotacionada (não usar default)
- [ ] Backup da chave em lugar seguro

### Redis
- [ ] Redis online e acessível
- [ ] REDIS_URL configurado
- [ ] Hybrid cache (Redis + BD) implementado
- [ ] Job de cleanup (meia-noite) agendado e testado
- [ ] Health check do Redis ativo

### Webhook Signature Validation
- [ ] META_APP_SECRET configurado
- [ ] Signature validation testado (válida e inválida)
- [ ] Timing-safe comparison implementado

### Dead Letter Queue
- [ ] `processed` flag no webhook log implementado
- [ ] Webhook retry job (a cada 5 min) rodando
- [ ] Max 3 retry attempts por webhook
- [ ] Dashboard de webhooks mortos acessível

### Token Health Check
- [ ] Job de token health check (2AM) agendado
- [ ] META_APP_ACCESS_TOKEN configurado para debug_token
- [ ] Alertas para tokens expirados implementados
- [ ] Endpoint `/check-connection` respondendo corretamente

### Coexistence Mode
- [ ] ✅ Testar com Meta: "Coexistence mode envia sessionInfo?"
- [ ] Tratamento de 3 casos implementado:
  - [ ] Caso 1: trackingCode presente
  - [ ] Caso 2: trackingCode ausente, mas owner_business_id match
  - [ ] Caso 3: Nenhum → phantom connection
- [ ] UI para reclamar WABA órfã implementada

### Rate Limiting
- [ ] IP-based (1000/min) configurado
- [ ] Org-based (100/min) configurado
- [ ] Burst limit (10 simultâneos) implementado
- [ ] Alertas quando ativado

---

## 🟠 IMPORTANTE (Antes de deploy)

### Monitoring & Alerts
- [ ] Sentry configurado e funcionando
- [ ] Alertas para:
  - [ ] Redis down
  - [ ] Webhook failures (> 5% error rate)
  - [ ] Token expiring soon
  - [ ] Rate limit exceeded
  - [ ] Orphan WABA detected
- [ ] CloudWatch / Datadog métricas configuradas
- [ ] PagerDuty integrado para críticos

### E2E Tests
- [ ] Todos os testes passando: `npm test -- tests/whatsapp-*.e2e.test.ts`
- [ ] Coverage > 80%
- [ ] Staging webhook endpoint removido de produção
- [ ] Manual testing completo em staging

### Environment Variables
- [ ] Todos configurados no .env.production:
  ```
  NEXT_PUBLIC_META_APP_ID=
  NEXT_PUBLIC_META_CONFIG_ID=
  META_APP_SECRET=
  META_APP_ACCESS_TOKEN=
  META_WEBHOOK_VERIFY_TOKEN=
  TOKEN_ENCRYPTION_KEY=
  REDIS_URL=
  SENTRY_DSN=
  ```
- [ ] Nenhum valor default/placeholder
- [ ] Secrets não commitados em git

### Logging
- [ ] Logger centralizado configurado
- [ ] Structured logs (json) habilitados
- [ ] Log levels apropriados (debug → info → warn → error)
- [ ] Logs de webhook auditáveis

---

## 🟡 RECOMENDADO (Para produção robusta)

### Performance
- [ ] Webhook responses < 1s (com fallback)
- [ ] Retry job não sobrecarrega DB
- [ ] Redis cache hit rate > 80%
- [ ] Query times testados com load

### Backup & Recovery
- [ ] DB backups diários configurados
- [ ] Disaster recovery plan documentado
- [ ] Rollback procedure testado
- [ ] Data retention policy (webhooks mortos após 30d?)

### Documentation
- [ ] README atualizado
- [ ] Runbook para troubleshooting criado
- [ ] Escalation procedures documentadas
- [ ] Team treinado

### Gradual Rollout
- [ ] Feature flag (ex: Unleash) setup (recomendado)
- [ ] Rollout plan:
  - [ ] Dia 1: 10% de orgs
  - [ ] Dia 3: 25% de orgs
  - [ ] Dia 5: 50% de orgs
  - [ ] Dia 7: 100% de orgs
- [ ] Fallback para v1 if needed
- [ ] Monitoring ativo 24h durante rollout

---

## 📋 Pre-Deployment Validation (Última checagem)

### Code Quality
- [ ] SonarQube score > 80
- [ ] Linter passa (eslint, prettier)
- [ ] TypeScript strict mode sem warnings
- [ ] No console.logs em production code

### Security Scan
- [ ] Dependências checadas: `npm audit`
- [ ] Secrets não expostos em código
- [ ] CORS configurado corretamente
- [ ] Rate limiting está ativo

### Performance Check
- [ ] Load test com 100 webhooks/s
- [ ] Memory leak test (processo estável por 1h)
- [ ] Database connection pooling ok
- [ ] Redis memory usage normal

### Compliance
- [ ] Data residency ok (BD em região correta)
- [ ] LGPD/GDPR compliant se aplicável
- [ ] Encryption in transit (HTTPS)
- [ ] Encryption at rest (tokens)

---

## 🚀 Deployment Steps

### 1. Staging Validation (24h antes)

```bash
# Rodar migrations em staging
npx prisma migrate deploy --skip-generate

# Rodar testes em staging
NODE_ENV=staging npm test

# Smoke test do webhook (via staging endpoint)
curl -X POST http://staging.seu-saas.com/api/v1/whatsapp/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"type":"partner-added","trackingCode":"test-123"}'

# Verificar logs
tail -f /var/log/seu-saas/whatsapp.log
```

### 2. Pre-Production Checks (1h antes)

```bash
# Backup do BD
pg_dump seu_database > backup-$(date +%Y%m%d).sql

# Verificar health do Redis
redis-cli ping

# Verificar env vars
env | grep META_ | grep -v SECRET

# Verificar jobs agendados
crontab -l | grep whatsapp
```

### 3. Deployment

```bash
# Blue-green deploy (recomendado)
# 1. Deploy em nova instância
# 2. Rodar migrations
# 3. Warm up cache
# 4. Switch traffic
# 5. Monitor por 24h

git checkout main
git pull origin main
npm ci
npx prisma migrate deploy
npm run build
npm start
```

### 4. Post-Deployment (1h depois)

```bash
# Smoke tests
curl http://seu-saas.com/api/v1/whatsapp/check-connection

# Verificar logs (sem erros críticos)
grep "ERROR\|CRITICAL" /var/log/seu-saas/whatsapp.log

# Verificar DB
SELECT COUNT(*) FROM whatsapp_onboarding WHERE created_at > NOW() - INTERVAL '5 minutes';

# Verificar Redis
redis-cli INFO stats | grep keyspace_hits

# Monitorar Sentry por 30 min
# (não deve ter novo erros)
```

---

## ⚠️ Rollback Procedure

Se algo der errado:

```bash
# 1. Rollback código
git revert HEAD

# 2. Rollback DB (se houve breaking changes)
# Usar última migration antes da v2
npx prisma migrate resolve --rolled-back MIGRATION_NAME

# 3. Limpar caches
redis-cli FLUSHDB

# 4. Restart services
systemctl restart seu-saas
systemctl restart seu-saas-jobs
```

---

## 📊 Post-Deployment Monitoring (Primeiros 7 dias)

| Métrica | Alvo | Frequência |
|---------|------|-----------|
| Webhook success rate | > 99% | Real-time |
| Webhook latency p99 | < 1s | 5 min |
| Redis health | UP | 1 min |
| DLQ retry rate | < 1% | 5 min |
| Error rate | < 0.1% | 5 min |
| Onboarding completion | > 95% | 1h |

---

## 🎯 Sign-off

- [ ] Tech Lead aprovado
- [ ] DevOps aprovado
- [ ] Jira ticket fechado
- [ ] Slack notification sent

---

**Depois de completar isto, você está pronto para produção! 🚀**

Qualquer problema? Veja `troubleshooting.md` ou entre em contato com `#ops-channel`.
