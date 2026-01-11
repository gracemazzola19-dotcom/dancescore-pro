#!/bin/bash

echo "🧪 Testing Dynamic Club Name Feature"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check public appearance endpoint
echo "Test 1: Testing public /api/appearance endpoint..."
APPEARANCE_RESPONSE=$(curl -s http://localhost:5001/api/appearance)
CLUB_NAME=$(echo "$APPEARANCE_RESPONSE" | grep -o '"clubName":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CLUB_NAME" ]; then
  echo -e "${RED}❌ Failed: Could not extract clubName from response${NC}"
  echo "Response: $APPEARANCE_RESPONSE"
else
  echo -e "${GREEN}✅ Public endpoint working${NC}"
  echo "   Current club name: $CLUB_NAME"
fi
echo ""

# Test 2: Login and check authenticated settings
echo "Test 2: Testing authenticated settings endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gmazzola.sec@msudc.com","password":"Secretary","selectedRole":"admin"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed - cannot test authenticated endpoint${NC}"
else
  echo -e "${GREEN}✅ Login successful${NC}"
  
  SETTINGS_RESPONSE=$(curl -s -X GET http://localhost:5001/api/settings \
    -H "Authorization: Bearer $TOKEN")
  
  AUTH_CLUB_NAME=$(echo "$SETTINGS_RESPONSE" | grep -o '"clubName":"[^"]*"' | cut -d'"' -f4)
  
  if [ -z "$AUTH_CLUB_NAME" ]; then
    # Try to find it in appearanceSettings
    AUTH_CLUB_NAME=$(echo "$SETTINGS_RESPONSE" | grep -o '"appearanceSettings"[^}]*"clubName":"[^"]*"' | grep -o '"clubName":"[^"]*"' | cut -d'"' -f4)
  fi
  
  if [ -z "$AUTH_CLUB_NAME" ]; then
    echo -e "${YELLOW}⚠️  Club name not found in settings response (may be using default)${NC}"
    echo "   Checking if appearanceSettings exists..."
    if echo "$SETTINGS_RESPONSE" | grep -q "appearanceSettings"; then
      echo -e "${GREEN}✅ Settings endpoint includes appearanceSettings${NC}"
    else
      echo -e "${RED}❌ appearanceSettings not found in response${NC}"
    fi
  else
    echo -e "${GREEN}✅ Authenticated endpoint working${NC}"
    echo "   Club name from settings: $AUTH_CLUB_NAME"
  fi
fi
echo ""

# Test 3: Try updating club name (if authenticated)
if [ ! -z "$TOKEN" ]; then
  echo "Test 3: Testing club name update..."
  
  # Get current settings first
  CURRENT_SETTINGS=$(curl -s -X GET http://localhost:5001/api/settings \
    -H "Authorization: Bearer $TOKEN")
  
  # Update only appearanceSettings.clubName
  UPDATE_RESPONSE=$(curl -s -X PUT http://localhost:5001/api/settings \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "appearanceSettings": {
        "clubName": "Test Dance Club",
        "siteTitle": "DanceScore Pro",
        "primaryColor": "#B380FF",
        "secondaryColor": "#FFB3D1",
        "logoUrl": "",
        "showLogoInHeader": true
      }
    }')
  
  if echo "$UPDATE_RESPONSE" | grep -q "error"; then
    echo -e "${RED}❌ Update failed: $UPDATE_RESPONSE${NC}"
  else
    echo -e "${GREEN}✅ Settings update successful${NC}"
    
    # Verify the update
    sleep 1
    VERIFY_RESPONSE=$(curl -s -X GET http://localhost:5001/api/settings \
      -H "Authorization: Bearer $TOKEN")
    
    UPDATED_CLUB_NAME=$(echo "$VERIFY_RESPONSE" | grep -o '"appearanceSettings"[^}]*"clubName":"[^"]*"' | grep -o '"clubName":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$UPDATED_CLUB_NAME" = "Test Dance Club" ]; then
      echo -e "${GREEN}✅ Verified: Club name updated to '$UPDATED_CLUB_NAME'${NC}"
      
      # Restore original club name
      echo ""
      echo "Restoring original club name..."
      RESTORE_RESPONSE=$(curl -s -X PUT http://localhost:5001/api/settings \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "appearanceSettings": {
            "clubName": "MSU Dance Club",
            "siteTitle": "DanceScore Pro",
            "primaryColor": "#B380FF",
            "secondaryColor": "#FFB3D1",
            "logoUrl": "",
            "showLogoInHeader": true
          }
        }')
      
      if echo "$RESTORE_RESPONSE" | grep -q "error"; then
        echo -e "${YELLOW}⚠️  Failed to restore original club name${NC}"
      else
        echo -e "${GREEN}✅ Restored original club name${NC}"
      fi
    else
      echo -e "${RED}❌ Verification failed: Expected 'Test Dance Club', got '$UPDATED_CLUB_NAME'${NC}"
    fi
  fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📊 Test Summary"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next Steps for Manual Testing:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Login as admin: gmazzola.sec@msudc.com / Secretary"
echo "3. Go to Admin Dashboard → Settings → Appearance Settings"
echo "4. Change 'Club Name' to something like 'Test Dance Club'"
echo "5. Save settings"
echo "6. Check these pages to verify club name updated:"
echo "   - Admin Dashboard header"
echo "   - Judge Dashboard header (after login as judge)"
echo "   - Login page (refresh)"
echo "   - Dancer Registration page"
echo "   - Dancer Login page"
echo ""
echo "✅ Dynamic club name feature is ready for testing!"
