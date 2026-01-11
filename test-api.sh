#!/bin/bash

echo "🧪 Testing Multi-Tenant API"
echo "============================"
echo ""

# Test 1: Check health endpoint
echo "1. Testing server health..."
HEALTH=$(curl -s http://localhost:5001/api/health)
echo "Response: $HEALTH"
echo ""

# Test 2: Try to login and get token with clubId
echo "2. Testing login (will show clubId in response)..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gmazzola.sec@msudc.com","password":"Secretary","selectedRole":"admin"}')

echo "Login Response (first 500 chars):"
echo "$LOGIN_RESPONSE" | head -c 500
echo ""
echo ""

# Extract token if available
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "⚠️  Could not extract token. Login may have failed."
  echo "Full response: $LOGIN_RESPONSE"
  echo ""
  echo "Let's check what judges exist in the database..."
  exit 1
fi

echo "✅ Token extracted successfully"
echo ""

# Decode token to show clubId (using node)
echo "3. Decoding JWT token to verify clubId..."
NODE_SCRIPT="
const jwt = require('jsonwebtoken');
const token = '$TOKEN';
try {
  const decoded = jwt.decode(token);
  console.log('Token payload:', JSON.stringify(decoded, null, 2));
  if (decoded.clubId) {
    console.log('✅ clubId found in token:', decoded.clubId);
  } else {
    console.log('❌ clubId NOT found in token');
  }
} catch (e) {
  console.log('Error decoding token:', e.message);
}
"

cd /Users/gracemazzola/dancescore-pro/server && node -e "$NODE_SCRIPT"
echo ""

# Test 4: Test judges endpoint with token
if [ ! -z "$TOKEN" ]; then
  echo "4. Testing /api/judges endpoint (should filter by clubId)..."
  JUDGES_RESPONSE=$(curl -s -X GET http://localhost:5001/api/judges \
    -H "Authorization: Bearer $TOKEN")
  
  echo "Judges Response (first 1000 chars):"
  echo "$JUDGES_RESPONSE" | head -c 1000
  echo ""
  echo ""
  
  # Check if response contains clubId
  if echo "$JUDGES_RESPONSE" | grep -q "clubId"; then
    echo "✅ Response includes clubId field"
  else
    echo "⚠️  Response may not include clubId (might be empty array)"
  fi
fi

echo ""
echo "✅ API Test Complete"
echo ""
echo "Next Steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Login with any judge credentials"
echo "3. Open browser console (F12) and check Network tab"
echo "4. Verify that clubId appears in API responses"
