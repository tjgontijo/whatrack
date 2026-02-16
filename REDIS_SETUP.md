# Redis & Centrifugo Setup Guide

## Architecture

- **Redis**: TCP service (port 6379) - NOT routed via Traefik
- **Centrifugo**: HTTP service (port 8000) - Routed via Traefik
- **Network**: Docker Swarm overlay network `redeinterna`

## Deployment on Docker Swarm

### 1. Create the overlay network (if not exists)

```bash
docker network create --driver overlay --scope swarm redeinterna
```

### 2. Create Redis data volume (if not exists)

```bash
docker volume create redis_data
```

### 3. Deploy the stack

```bash
docker stack deploy -c docker-compose.improved.yml whatrack
```

### 4. Verify services are running

```bash
# Check services
docker service ls

# Check Redis health
docker exec whatrack-redis redis-cli -a 4f9c2a8d7b1e6c3f ping

# Check Centrifugo health
curl http://localhost:8000/api/ping
```

## Accessing Redis

### From within Docker network
```
redis://:4f9c2a8d7b1e6c3f@redis:6379
```

### From outside Docker (from app server)
```
redis://:4f9c2a8d7b1e6c3f@<SWARM_SERVER_IP>:6379
```

Replace `<SWARM_SERVER_IP>` with your actual server IP, e.g.:
```
redis://:4f9c2a8d7b1e6c3f@192.168.1.100:6379
```

## Accessing Centrifugo

### Admin panel
```
https://centrifugo.whatrack.com/admin
```

Password: `3c8a1f6d9b2e7a4c`

### API endpoint
```
https://centrifugo.whatrack.com/api
```

## Configuration in .env

```bash
# Redis URL - use IP of Swarm server
REDIS_URL="redis://:4f9c2a8d7b1e6c3f@<YOUR_SWARM_IP>:6379"

# Centrifugo
CENTRIFUGO_URL="https://centrifugo.whatrack.com"
CENTRIFUGO_API_KEY="7f5a2d9c4e8b1a6f3d0c9e7b2a4f6c1d"
CENTRIFUGO_TOKEN_SECRET="1a9e5c7b3d4f8a2c6e0b7d9f4a1c3e5b"
```

## Testing Redis Connection

Once deployed, you can test the health check endpoint:

```bash
curl https://whatrack.com/api/v1/health/redis
```

Response if connected:
```json
{
  "redis": {
    "connected": true,
    "testPassed": true,
    "testKey": "redis-health-check",
    "testValue": "ok-1234567890",
    "retrieved": "ok-1234567890"
  }
}
```

Response if disconnected (fallback):
```json
{
  "redis": {
    "connected": false,
    "testPassed": false,
    "testKey": "redis-health-check",
    "testValue": "ok-1234567890",
    "retrieved": null
  }
}
```

## Troubleshooting

### Redis not connecting from app

1. Check firewall allows port 6379 from app server to Swarm server
   ```bash
   # From app server
   nc -zv <SWARM_SERVER_IP> 6379
   ```

2. Check Redis is running
   ```bash
   docker service logs whatrack_redis
   ```

3. Test connection manually
   ```bash
   redis-cli -h <SWARM_SERVER_IP> -a 4f9c2a8d7b1e6c3f ping
   ```

### Centrifugo not connecting

1. Check service is running
   ```bash
   docker service logs whatrack_centrifugo
   ```

2. Check Traefik routing
   ```bash
   curl -H "Host: centrifugo.whatrack.com" http://localhost/api/ping
   ```

### Rate limiting not working

If rate limiting always allows requests, Redis is not connected. Check:
- `REDIS_URL` is correct
- Port 6379 is accessible
- Redis password is correct

The system has graceful fallback - if Redis fails, all requests are allowed (no rate limiting).

## Security Notes

⚠️ **Important**: The Redis password and API keys in this file are examples only.

For production:
1. Change all passwords and secrets
2. Use firewall rules to restrict port 6379 access
3. Consider using Redis Sentinel or Cluster
4. Use TLS for Redis connections (update URL to `rediss://`)
5. Enable Traefik authentication for Centrifugo admin panel
