# Centrifugo - Guia de Resolução de Problemas

## Visão Geral

Centrifugo é o serviço de mensagens em tempo real do WhaTrack. Usa WebSocket para enviar atualizações ao vivo sem necessidade de polling.

**URL WebSocket:** `wss://centrifugo.whatrack.com/connection/websocket`
**URL HTTP API:** `https://centrifugo.whatrack.com`

## Arquitetura

```
Navegador (Cliente)
    ↓ (WebSocket)
Servidor Centrifugo (wss://centrifugo.whatrack.com)
    ↓ (Redis pub/sub)
Redis (remoto, acessado internamente)
    ↑ (HTTP API)
Aplicação Next.js (Backend via Vercel)
```

## Diagnóstico Rápido

### 1. Verificar se o Servidor Centrifugo está Rodando

```bash
# Testar endpoint HTTP API via HTTPS
curl https://centrifugo.whatrack.com/api/ping

# Resposta esperada: {"result":{}}
```

### 2. Verificar Geração de Token

```bash
# Obter um token de conexão
# Primeiro faça login para obter cookies, depois:
curl -b "cookies.txt" https://whatrack.com/api/v1/centrifugo/token

# Ou se tiver uma sessão válida:
curl -H "Authorization: Bearer SEU_TOKEN" \
  https://whatrack.com/api/v1/centrifugo/token

# Deve retornar: {"token":"eyJhbGciOiJIUzI1NiIs..."}
```

### 3. Verificar Conexão WebSocket no Navegador

Abra DevTools (F12) → Aba Console e cole:

```javascript
// Testar conexão WebSocket
const ws = new WebSocket('wss://centrifugo.whatrack.com/connection/websocket');
ws.onopen = () => {
  console.log('✓ WebSocket conectado');
  console.log('Pronto para receber atualizações em tempo real');
};
ws.onerror = (e) => console.error('✗ Erro WebSocket:', e);
ws.onclose = () => console.log('✗ WebSocket fechado');
ws.onmessage = (e) => console.log('Mensagem recebida:', e.data);
```

## Problemas Comuns & Soluções

### Problema 1: "Falha ao obter token do Centrifugo"

**Sintomas:**
- Erro no console: `[Centrifugo] Token fetch failed: 401`
- Nenhuma conexão WebSocket

**Causas:**
1. Usuário não autenticado
2. Sem acesso à organização
3. `CENTRIFUGO_TOKEN_HMAC_SECRET_KEY` não configurada no backend

**Soluções:**
```bash
# Verificar se o usuário está logado
# Verificar se a organização é acessível
# Verificar se .env tem CENTRIFUGO_TOKEN_HMAC_SECRET_KEY
grep CENTRIFUGO_TOKEN_HMAC_SECRET_KEY /caminho/para/.env
```

### Problema 2: "Conexão WebSocket falhou"

**Sintomas:**
- Token obtido com sucesso
- Console mostra erro na conexão WebSocket
- Aba Network mostra falha na requisição WebSocket com 403/502/503

**Causas:**
1. Servidor Centrifugo não está rodando
2. Problema de SSL/TLS certificado
3. Traefik não está roteando corretamente para Centrifugo
4. Problema de conexão Redis no Centrifugo

**Soluções:**
```bash
# 1. Verificar endpoint HTTPS
curl -v https://centrifugo.whatrack.com/api/ping

# 2. Verificar painel admin
curl https://centrifugo.whatrack.com/admin

# 3. Verificar certificado
openssl s_client -connect centrifugo.whatrack.com:443

# 4. Verificar logs de Centrifugo (se tiver acesso SSH)
docker service logs whatrack_centrifugo --tail 100 | grep -i error
```

### Problema 3: "Conectado mas sem atualizações em tempo real"

**Sintomas:**
- WebSocket conecta com sucesso
- Sem erros de subscrição
- Mas as mensagens não chegam em tempo real

**Causas:**
1. Mensagens não sendo publicadas no canal correto
2. Redis pub/sub não funcionando
3. Subscrição ao canal não funcionando

**Soluções:**
```bash
# 1. Verificar logs para "publish" events
docker service logs whatrack_centrifugo --tail 100 | grep -i publish

# 2. Verificar conexão Redis
docker service logs whatrack_centrifugo --tail 100 | grep -i redis

# 3. Verificar subscrição no navegador
# Deve aparecer: [Centrifugo] Subscribed to org:ORG_ID:messages
# Verificar console para eventos de subscrição
```

### Problema 4: "Erro de Certificado ou CORS"

**Sintomas:**
- Console mostra erros de CORS
- WebSocket mostra avisos de certificado ou "Mixed content"

**Soluções:**
```bash
# 1. Verificar HTTPS
curl -v https://centrifugo.whatrack.com/admin

# 2. Verificar validade do certificado
openssl s_client -connect centrifugo.whatrack.com:443

# 3. No navegador, verificar:
# - URL é HTTPS (não HTTP)
# - URL é WSS (não WS)
```

## Passos de Debug (Em Ordem)

### Passo 1: Verificar Autenticação

Acesse https://whatrack.com e faça login. Abra DevTools (F12) e execute:

```javascript
// Obter um token fresco
fetch('/api/v1/centrifugo/token')
  .then(r => r.json())
  .then(d => {
    console.log('✓ Token obtido:', d.token.substring(0, 20) + '...');
    return d.token;
  })
  .catch(e => console.error('✗ Falha ao obter token:', e));
```

Deve aparecer um token começando com `eyJ`

### Passo 2: Verificar Acessibilidade do Servidor

```bash
# Verificar se endpoint HTTPS é acessível
curl https://centrifugo.whatrack.com/api/ping

# Resposta esperada: {"result":{}}
```

### Passo 3: Verificar WebSocket no Navegador

No DevTools Console (F12):

```javascript
// Testar conexão WebSocket bruta (sem auth obrigatória)
const ws = new WebSocket('wss://centrifugo.whatrack.com/connection/websocket');

ws.onopen = () => {
  console.log('✓ WebSocket conectado ao Centrifugo');

  // Enviar mensagem de conexão com token
  fetch('/api/v1/centrifugo/token')
    .then(r => r.json())
    .then(d => {
      ws.send(JSON.stringify({
        type: 1,
        token: d.token
      }));
      console.log('✓ Token de autenticação enviado');
    });
};

ws.onerror = (e) => {
  console.error('✗ Erro WebSocket:', e);
};

ws.onclose = () => {
  console.log('✗ WebSocket fechado');
};

ws.onmessage = (e) => {
  console.log('Mensagem do Centrifugo:', JSON.parse(e.data));
};
```

### Passo 4: Monitorar Logs (Se Tiver Acesso SSH)

```bash
# Se tiver acesso SSH ao host Docker:
docker service logs whatrack_centrifugo --tail 200 --follow
```

Procure por:
- Status de conexão com Redis
- Tentativas de conexão WebSocket
- Mensagens "client connected"
- Qualquer mensagem de erro

### Passo 5: Verificar Logs da Aplicação

No DevTools Console, procure por logs começando com `[Centrifugo]`:
- `[Centrifugo] Token fetched successfully` ✓
- `[Centrifugo] Connected` ✓
- `[Centrifugo] Connection error:` ✗
- `[Centrifugo] Disconnected` ✗

## Checklist de Configuração

Backend (`.env`):
- [ ] `CENTRIFUGO_URL=https://centrifugo.whatrack.com`
- [ ] `CENTRIFUGO_API_KEY=<segredo>`
- [ ] `CENTRIFUGO_TOKEN_HMAC_SECRET_KEY=<segredo>`
- [ ] `CENTRIFUGO_ADMIN_PASSWORD=<segredo>`
- [ ] `CENTRIFUGO_ADMIN_SECRET=<segredo>`

Frontend (`.env`):
- [ ] `NEXT_PUBLIC_CENTRIFUGO_URL=wss://centrifugo.whatrack.com/connection/websocket`

Docker Stack:
- [ ] Container Redis rodando
- [ ] Container Centrifugo rodando na porta 8000
- [ ] Traefik roteando `centrifugo.whatrack.com` para Centrifugo:8000
- [ ] Certificados TLS válidos e configurados

## Comandos Úteis

```bash
# Monitorar Centrifugo em tempo real
docker service logs whatrack_centrifugo -f

# Verificar stats via HTTP API
curl -H "Authorization: apikey <API_KEY>" \
  https://centrifugo.whatrack.com/api/stats

# Verificar canais disponíveis (requer admin token)
curl -H "Authorization: apikey <API_KEY>" \
  https://centrifugo.whatrack.com/api/channels

# Publicar mensagem de teste
curl -X POST https://centrifugo.whatrack.com/api/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: apikey <API_KEY>" \
  -d '{"channel":"test","data":{"ola":"mundo"}}'
```

## Exemplos de Log

### Conexão Bem-Sucedida
```
[Centrifugo] Token fetched successfully
[Centrifugo] Connected
[Centrifugo] Subscribed to org:123:messages
[Centrifugo] Subscribed to org:123:tickets
```

### Erro de Conexão Redis
```
error creating engine: dial tcp redis:6379: connect: connection refused
```

### Configuração Faltando
```
[Centrifugo] CENTRIFUGO_TOKEN_HMAC_SECRET_KEY not configured
```

### Falha de Conexão WebSocket
```
[Centrifugo] Connection error: WebSocket closed with code 1002
```

## Canais de Teste

A aplicação se inscreve nestes canais (substitua `ORG_ID` pelo ID da sua organização):

1. **Canal de Mensagens:** `org:ORG_ID:messages`
   - Acionado quando novas mensagens chegam
   - Atualiza: chat-messages, whatsapp-chats queries

2. **Canal de Tickets:** `org:ORG_ID:tickets`
   - Acionado quando status de ticket muda
   - Atualiza: conversation-ticket, whatsapp-chats queries

## Próximos Passos

Se os passos de troubleshooting não resolverem:

1. Verifique `/Users/thiago/www/whatrack/REDIS_SETUP.md` para configuração de Redis
2. Verifique `/Users/thiago/www/whatrack/docs/INBOX-REALTIME-PRD.md` para detalhes de arquitetura
3. Consulte documentação oficial: https://centrifugo.dev
4. Revise logs do Centrifugo para mensagens de erro específicas

## Resumo Rápido

| O que fazer | Comando |
|------------|---------|
| Testar servidor | `curl https://centrifugo.whatrack.com/api/ping` |
| Obter token | No console: `fetch('/api/v1/centrifugo/token').then(r => r.json())` |
| Testar WebSocket | Cole o código JavaScript acima no console |
| Ver logs | `docker service logs whatrack_centrifugo -f` |
| Verificar certificado | `openssl s_client -connect centrifugo.whatrack.com:443` |
