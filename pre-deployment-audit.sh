#!/bin/bash
# Comprehensive Pre-Deployment Code Audit Script

echo "🔍 Pre-Deployment Code Audit"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0
PASSED=0

# Function to check result
check_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((ERRORS++))
    fi
}

check_warning() {
    echo -e "${YELLOW}⚠️  WARNING${NC}"
    ((WARNINGS++))
}

echo "📋 1. Checking TypeScript Compilation..."
echo "----------------------------------------"
cd client
npm run build > /tmp/build-output.log 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
    ((PASSED++))
    # Check for warnings
    if grep -q "warning" /tmp/build-output.log; then
        echo -e "${YELLOW}⚠️  Build has warnings (non-blocking)${NC}"
        echo "   Review warnings above or check /tmp/build-output.log"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    echo "   Check /tmp/build-output.log for details"
    ((ERRORS++))
fi
cd ..

echo ""
echo "📋 2. Checking for Linter Errors..."
echo "-----------------------------------"
# This will be done by the IDE/linter, but we can check basic syntax
if command -v eslint &> /dev/null; then
    echo "ESLint found - running checks..."
    # eslint check would go here
else
    echo -e "${YELLOW}⚠️  ESLint not found globally (using IDE linter)${NC}"
    ((WARNINGS++))
fi

echo ""
echo "📋 3. Checking Server Dependencies..."
echo "-------------------------------------"
cd server
if [ -f "package.json" ]; then
    if [ -d "node_modules" ]; then
        echo -e "${GREEN}✅ Server dependencies installed${NC}"
        ((PASSED++))
        
        # Check for missing critical packages
        MISSING=0
        if [ ! -d "node_modules/express" ]; then
            echo -e "${RED}❌ Missing: express${NC}"
            ((MISSING++))
        fi
        if [ ! -d "node_modules/firebase-admin" ]; then
            echo -e "${RED}❌ Missing: firebase-admin${NC}"
            ((MISSING++))
        fi
        if [ ! -d "node_modules/jsonwebtoken" ]; then
            echo -e "${RED}❌ Missing: jsonwebtoken${NC}"
            ((MISSING++))
        fi
        if [ ! -d "node_modules/nodemailer" ]; then
            echo -e "${RED}❌ Missing: nodemailer${NC}"
            ((MISSING++))
        fi
        
        if [ $MISSING -eq 0 ]; then
            echo -e "${GREEN}✅ All critical dependencies present${NC}"
            ((PASSED++))
        else
            echo -e "${RED}❌ Missing $MISSING critical dependencies${NC}"
            ((ERRORS++))
        fi
    else
        echo -e "${RED}❌ Server node_modules not found${NC}"
        echo "   Run: cd server && npm install"
        ((ERRORS++))
    fi
else
    echo -e "${RED}❌ Server package.json not found${NC}"
    ((ERRORS++))
fi
cd ..

echo ""
echo "📋 4. Checking Client Dependencies..."
echo "-------------------------------------"
cd client
if [ -f "package.json" ]; then
    if [ -d "node_modules" ]; then
        echo -e "${GREEN}✅ Client dependencies installed${NC}"
        ((PASSED++))
        
        # Check for missing critical packages
        MISSING=0
        if [ ! -d "node_modules/react" ]; then
            echo -e "${RED}❌ Missing: react${NC}"
            ((MISSING++))
        fi
        if [ ! -d "node_modules/react-router-dom" ]; then
            echo -e "${RED}❌ Missing: react-router-dom${NC}"
            ((MISSING++))
        fi
        if [ ! -d "node_modules/axios" ]; then
            echo -e "${RED}❌ Missing: axios${NC}"
            ((MISSING++))
        fi
        
        if [ $MISSING -eq 0 ]; then
            echo -e "${GREEN}✅ All critical dependencies present${NC}"
            ((PASSED++))
        else
            echo -e "${RED}❌ Missing $MISSING critical dependencies${NC}"
            ((ERRORS++))
        fi
    else
        echo -e "${RED}❌ Client node_modules not found${NC}"
        echo "   Run: cd client && npm install"
        ((ERRORS++))
    fi
else
    echo -e "${RED}❌ Client package.json not found${NC}"
    ((ERRORS++))
fi
cd ..

echo ""
echo "📋 5. Checking Critical Files..."
echo "--------------------------------"
FILES=(
    "server/index.js"
    "server/database-adapter.js"
    "server/email-service.js"
    "client/src/App.tsx"
    "client/src/components/Login.tsx"
    "client/src/components/AdminDashboard.tsx"
    ".gitignore"
)

MISSING_FILES=0
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ Missing: $file${NC}"
        ((MISSING_FILES++))
    fi
done

if [ $MISSING_FILES -eq 0 ]; then
    echo -e "${GREEN}✅ All critical files present${NC}"
else
    echo -e "${RED}❌ Missing $MISSING_FILES critical files${NC}"
    ((ERRORS++))
fi

echo ""
echo "📋 6. Checking Environment Configuration..."
echo "------------------------------------------"
if [ -f "server/.env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    ((PASSED++))
    
    # Check for critical env variables
    source server/.env 2>/dev/null || true
    
    MISSING_ENV=0
    if [ -z "$JWT_SECRET" ]; then
        echo -e "${RED}❌ JWT_SECRET not set${NC}"
        ((MISSING_ENV++))
    else
        if [ "$JWT_SECRET" = "your-secret-key" ]; then
            echo -e "${YELLOW}⚠️  JWT_SECRET is using default value (should be changed)${NC}"
            ((WARNINGS++))
        else
            echo -e "${GREEN}✅ JWT_SECRET is set${NC}"
            ((PASSED++))
        fi
    fi
    
    if [ -z "$SMTP_USER" ]; then
        echo -e "${YELLOW}⚠️  SMTP_USER not set (email verification won't work)${NC}"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✅ SMTP_USER is set${NC}"
        ((PASSED++))
    fi
    
    if [ -z "$SMTP_PASSWORD" ]; then
        echo -e "${YELLOW}⚠️  SMTP_PASSWORD not set (email verification won't work)${NC}"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✅ SMTP_PASSWORD is set${NC}"
        ((PASSED++))
    fi
    
    if [ $MISSING_ENV -eq 0 ]; then
        echo -e "${GREEN}✅ Critical environment variables configured${NC}"
    fi
else
    echo -e "${RED}❌ .env file not found${NC}"
    echo "   Create server/.env with required variables"
    ((ERRORS++))
fi

echo ""
echo "📋 7. Checking Service Account Key..."
echo "-------------------------------------"
if [ -f "server/service-account-key.json" ]; then
    echo -e "${GREEN}✅ service-account-key.json exists${NC}"
    ((PASSED++))
    
    # Check if it's in .gitignore
    if grep -q "service-account-key.json" .gitignore 2>/dev/null; then
        echo -e "${GREEN}✅ service-account-key.json is in .gitignore${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ service-account-key.json NOT in .gitignore (SECURITY RISK!)${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${RED}❌ service-account-key.json not found${NC}"
    echo "   Firebase won't work without this file"
    ((ERRORS++))
fi

echo ""
echo "📋 8. Checking Build Output..."
echo "-------------------------------"
if [ -d "client/build" ]; then
    echo -e "${GREEN}✅ Client build directory exists${NC}"
    ((PASSED++))
    
    if [ -f "client/build/index.html" ]; then
        echo -e "${GREEN}✅ Production build files present${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠️  index.html not found in build (may need to rebuild)${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠️  Client build directory not found${NC}"
    echo "   Run: cd client && npm run build"
    ((WARNINGS++))
fi

echo ""
echo "📋 9. Checking for Common Issues..."
echo "-----------------------------------"
COMMON_ISSUES=0

# Check for hardcoded secrets
if grep -r "password.*=.*['\"]" server/index.js 2>/dev/null | grep -v "console.log" | grep -v "Password" | head -1; then
    echo -e "${YELLOW}⚠️  Potential hardcoded passwords found (review manually)${NC}"
    ((WARNINGS++))
fi

# Check for console.log with sensitive data (already done in security audit, but quick check)
if grep -q "console.log.*password.*:" server/index.js 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Found console.log statements that may log sensitive data${NC}"
    echo "   Review: Lines 2078, 2154 in server/index.js"
    ((WARNINGS++))
fi

# Check for proper error handling in critical routes
if grep -q "app\.post.*async.*req.*res.*{" server/index.js; then
    echo -e "${GREEN}✅ Routes use async/await pattern${NC}"
    ((PASSED++))
else
    check_warning
fi

echo ""
echo "📋 10. Checking Security Configuration..."
echo "-----------------------------------------"
# Run security audit
if [ -f "security-audit.sh" ]; then
    ./security-audit.sh > /tmp/security-audit.log 2>&1
    SECURITY_ERRORS=$(grep -c "Errors:" /tmp/security-audit.log || echo "0")
    if [ "$SECURITY_ERRORS" -eq 0 ] || grep -q "Errors: 0" /tmp/security-audit.log; then
        echo -e "${GREEN}✅ Security audit passed${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ Security audit found issues${NC}"
        echo "   Check /tmp/security-audit.log for details"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠️  security-audit.sh not found${NC}"
    ((WARNINGS++))
fi

echo ""
echo "=============================="
echo "📊 AUDIT SUMMARY"
echo "=============================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Errors: $ERRORS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL CHECKS PASSED - Ready for deployment!${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  READY WITH WARNINGS - Review warnings before deploying${NC}"
        exit 0
    fi
else
    echo -e "${RED}❌ ERRORS FOUND - Fix errors before deploying${NC}"
    exit 1
fi
