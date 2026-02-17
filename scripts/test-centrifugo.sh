#!/bin/bash

echo "🔍 Testing Centrifugo Connectivity"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if Centrifugo server is reachable
echo "1️⃣  Testing HTTP API endpoint..."
HTTP_RESULT=$(curl -s -w "\n%{http_code}" -H "Host: centrifugo.whatrack.com" http://localhost:8000/api/ping 2>&1)
HTTP_CODE=$(echo "$HTTP_RESULT" | tail -n1)
HTTP_BODY=$(echo "$HTTP_RESULT" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ HTTP API is reachable (Status: $HTTP_CODE)${NC}"
    echo "  Response: $HTTP_BODY"
else
    echo -e "${RED}✗ HTTP API unreachable (Status: $HTTP_CODE)${NC}"
    echo "  Response: $HTTP_BODY"
fi

echo ""
echo "2️⃣  Testing Centrifugo Admin Panel..."
ADMIN_RESULT=$(curl -s -w "\n%{http_code}" -H "Host: centrifugo.whatrack.com" http://localhost:8000/admin 2>&1)
ADMIN_CODE=$(echo "$ADMIN_RESULT" | tail -n1)

if [ "$ADMIN_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Admin panel is reachable${NC}"
    echo "  Access at: https://centrifugo.whatrack.com/admin"
else
    echo -e "${RED}✗ Admin panel unreachable (Status: $ADMIN_CODE)${NC}"
fi

echo ""
echo "3️⃣  Testing WebSocket endpoint availability..."
echo "  WebSocket URL: wss://centrifugo.whatrack.com/connection/websocket"
echo "  You can test this in browser console with:"
echo "  ${YELLOW}new WebSocket('wss://centrifugo.whatrack.com/connection/websocket')${NC}"

echo ""
echo "4️⃣  Configuration Summary:"
echo "  CENTRIFUGO_URL=${CENTRIFUGO_URL:-Not set}"
echo "  CENTRIFUGO_API_KEY=${CENTRIFUGO_API_KEY:0:10}*** (hidden)"
echo "  CENTRIFUGO_TOKEN_HMAC_SECRET_KEY=${CENTRIFUGO_TOKEN_HMAC_SECRET_KEY:0:10}*** (hidden)"
echo "  NEXT_PUBLIC_CENTRIFUGO_URL=${NEXT_PUBLIC_CENTRIFUGO_URL:-Not set}"

echo ""
echo "5️⃣  Next Steps:"
echo "  - Check browser console (DevTools > Console) for WebSocket connection errors"
echo "  - Monitor Centrifugo logs: ${YELLOW}docker service logs whatrack_centrifugo${NC}"
echo "  - Test token endpoint: curl http://localhost:3000/api/v1/centrifugo/token"
echo "  - Check CORS headers if WebSocket fails"
