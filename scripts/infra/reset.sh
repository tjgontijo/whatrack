#!/bin/bash
set -e

export DOCKER_HOST="unix://$HOME/.colima/default/docker.sock"

if ! colima status 2>/dev/null | grep -q "Running"; then
  echo "Starting Colima..."
  colima start
fi

docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
