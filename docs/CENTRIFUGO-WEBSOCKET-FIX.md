# WebSocket Centrifugo - Correção HTTP/2 vs HTTP/1.1

## Problema

Frontend não consegue conectar ao Centrifugo via WebSocket:
```
WebSocket connection to 'wss://centrifugo.whatrack.com/connection/websocket' failed
```

## Causa Raiz

O Traefik estava servindo o endpoint `/connection/websocket` via **HTTP/2**, mas WebSocket requer **HTTP/1.1** para o upgrade funcionar.

## Solução

No `infra/centrifugo-stack.yml`, adicionar ao `labels` do Centrifugo:

```yaml
- traefik.http.services.centrifugo.loadbalancer.server.scheme=http
```

Isso força o Traefik a:
1. Conectar ao Centrifugo via HTTP (não HTTPS, pois já tem TLS no Traefik)
2. Usar HTTP/1.1 (necessário para WebSocket upgrade)
3. Passar o upgrade de WebSocket corretamente

## Configuração Completa

```yaml
centrifugo_whatrack:
  image: centrifugo/centrifugo:v6

  # ... rest of config ...

  deploy:
    labels:
      - traefik.enable=1
      - traefik.http.routers.centrifugo.rule=Host(`centrifugo.whatrack.com`)
      - traefik.http.routers.centrifugo.entrypoints=websecure
      - traefik.http.routers.centrifugo.tls.certresolver=letsencryptresolver
      - traefik.http.routers.centrifugo.service=centrifugo
      - traefik.http.services.centrifugo.loadbalancer.server.port=8000
      # ✅ CRÍTICO para WebSocket
      - traefik.http.services.centrifugo.loadbalancer.server.scheme=http
```

## Deploy

```bash
docker stack deploy -c infra/centrifugo-stack.yml whatrack
```

## Teste

Após deploy, abra DevTools no navegador:

```javascript
// Console deve mostrar:
[Centrifugo] Token fetched successfully
[Centrifugo] Connected    // ← Se funciona
```

Se continuar falhando, verificar:
1. `docker service logs whatrack_centrifugo_whatrack`
2. `docker service ls` - confirmar que Centrifugo está running
3. Limpar cache do navegador (Ctrl+Shift+Del)
4. Fazer hard refresh (Ctrl+F5)
