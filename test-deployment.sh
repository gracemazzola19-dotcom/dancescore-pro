#!/bin/bash
# Test Deployment Script - Verifies all critical functionality

echo "🧪 Testing Deployment Readiness"
echo "================================"
echo ""

BASE_URL="${1:-http://localhost:5001}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0

# Test 1: Server is running
echo "1. Testing server connectivity..."
if curl -s -f "$BASE_URL/api/auth/verification-required" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not responding${NC}"
    FAILED=$((FAILED + 1))
fi

# Test 2: Email configuration
echo "2. Testing email configuration..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/test-email-config" -H "Content-Type: application/json")
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Email service is configured${NC}"
else
    echo -e "${YELLOW}⚠️  Email service may not be configured${NC}"
    echo "   Response: $RESPONSE"
fi

# Test 3: Verification required endpoint
echo "3. Testing verification endpoint..."
RESPONSE=$(curl -s "$BASE_URL/api/auth/verification-required")
if echo "$RESPONSE" | grep -q "requireVerification\|emailConfigured"; then
    echo -e "${GREEN}✅ Verification endpoint works${NC}"
else
    echo -e "${RED}❌ Verification endpoint failed${NC}"
    FAILED=$((FAILED + 1))
fi

# Test 4: Check client build
echo "4. Checking client build..."
if [ -d "client/build" ] && [ "$(ls -A client/build)" ]; then
    echo -e "${GREEN}✅ Client build exists${NC}"
else
    echo -e "${YELLOW}⚠️  Client build not found - run 'cd client && npm run build'${NC}"
fi

# Test 5: Check server dependencies
echo "5. Checking server dependencies..."
if [ -d "server/node_modules" ]; then
    echo -e "${GREEN}✅ Server dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Server dependencies not installed - run 'cd server && npm install'${NC}"
fi

# Test 6: Check environment variables
echo "6. Checking environment variables..."
if [ -f "server/.env" ]; then
    if grep -q "JWT_SECRET=" server/.env && ! grep -q "JWT_SECRET=your-super-secret" server/.env; then
        echo -e "${GREEN}✅ JWT_SECRET is configured${NC}"
    else
        echo -e "${RED}❌ JWT_SECRET needs to be set${NC}"
        FAILED=$((FAILED + 1))
    fi
    
    if grep -q "SMTP_PASSWORD=" server/.env && ! grep -q "SMTP_PASSWORD=YOUR_APP_PASSWORD_HERE" server/.env; then
        echo -e "${GREEN}✅ SMTP_PASSWORD is configured${NC}"
    else
        echo -e "${YELLOW}⚠️  SMTP_PASSWORD may need to be set${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env file not found (may use environment variables)${NC}"
fi

echo ""
echo "================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All critical tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Fix issues before deployment.${NC}"
    exit 1
fi
