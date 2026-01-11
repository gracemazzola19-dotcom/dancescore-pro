#!/bin/bash
# Security Audit Script for DanceScore Pro

echo "🔒 Security Audit for DanceScore Pro"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# 1. Check .gitignore exists
echo "1. Checking .gitignore..."
if [ -f .gitignore ]; then
    echo -e "${GREEN}✅ .gitignore exists${NC}"
    
    # Check for .env
    if grep -q "\.env" .gitignore; then
        echo -e "${GREEN}   ✅ .env is in .gitignore${NC}"
    else
        echo -e "${RED}   ❌ .env is NOT in .gitignore${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check for service account key
    if grep -q "service-account-key.json" .gitignore; then
        echo -e "${GREEN}   ✅ service-account-key.json is in .gitignore${NC}"
    else
        echo -e "${RED}   ❌ service-account-key.json is NOT in .gitignore${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}❌ .gitignore does not exist${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 2. Check for hardcoded secrets
echo "2. Checking for hardcoded secrets..."
SECRETS=$(grep -r "password.*=.*['\"].*['\"]" --include="*.js" --include="*.ts" server/ client/src/ 2>/dev/null | grep -v "node_modules" | grep -v "SMTP_PASSWORD\|JWT_SECRET" | grep -v "//.*password" | wc -l)
if [ "$SECRETS" -eq 0 ]; then
    echo -e "${GREEN}✅ No hardcoded passwords found${NC}"
else
    echo -e "${YELLOW}⚠️  Found $SECRETS potential hardcoded passwords${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 3. Check for default JWT secret
echo "3. Checking for default JWT secret..."
if grep -r "your-secret-key\|your-super-secret" --include="*.js" server/ 2>/dev/null | grep -v "node_modules" | grep -q "your-secret-key"; then
    echo -e "${YELLOW}⚠️  Default JWT secret found in code (fallback)${NC}"
    echo -e "${YELLOW}   Consider removing fallback for production${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ No default JWT secret in code${NC}"
fi
echo ""

# 4. Check for sensitive data in console.log
echo "4. Checking for sensitive data in logs..."
SENSITIVE_LOGS=$(grep -r "console.log.*password\|console.log.*secret\|console.log.*token" --include="*.js" --include="*.ts" server/ 2>/dev/null | grep -v "node_modules" | wc -l)
if [ "$SENSITIVE_LOGS" -eq 0 ]; then
    echo -e "${GREEN}✅ No sensitive data in console.log${NC}"
else
    echo -e "${YELLOW}⚠️  Found $SENSITIVE_LOGS console.log statements with sensitive data${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 5. Check if .env file exists and has required variables
echo "5. Checking .env file..."
if [ -f server/.env ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    
    # Check for JWT_SECRET
    if grep -q "JWT_SECRET=" server/.env && ! grep -q "JWT_SECRET=your-super-secret" server/.env; then
        echo -e "${GREEN}   ✅ JWT_SECRET is set${NC}"
    else
        echo -e "${RED}   ❌ JWT_SECRET is not set or using default${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check for SMTP configuration
    if grep -q "SMTP_HOST=" server/.env && grep -q "SMTP_PASSWORD=" server/.env && ! grep -q "SMTP_PASSWORD=YOUR_APP_PASSWORD_HERE" server/.env; then
        echo -e "${GREEN}   ✅ SMTP configuration is set${NC}"
    else
        echo -e "${YELLOW}   ⚠️  SMTP configuration may be incomplete${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  .env file not found (may be intentional for production)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 6. Check for git repository
echo "6. Checking git repository..."
if [ -d .git ]; then
    echo -e "${GREEN}✅ Git repository found${NC}"
    
    # Check if .env is tracked
    if git ls-files | grep -q "\.env"; then
        echo -e "${RED}   ❌ .env file is tracked in git!${NC}"
        echo -e "${RED}   ⚠️  CRITICAL: Remove .env from git immediately!${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}   ✅ .env is not tracked in git${NC}"
    fi
    
    # Check if service account key is tracked
    if git ls-files | grep -q "service-account-key.json"; then
        echo -e "${RED}   ❌ service-account-key.json is tracked in git!${NC}"
        echo -e "${RED}   ⚠️  CRITICAL: Remove service account key from git immediately!${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}   ✅ service-account-key.json is not tracked in git${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Not a git repository${NC}"
fi
echo ""

# Summary
echo "======================================"
echo "📊 Audit Summary:"
echo -e "   ${RED}Errors: $ERRORS${NC}"
echo -e "   ${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All security checks passed!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Some warnings found. Review before deployment.${NC}"
    exit 0
else
    echo -e "${RED}❌ Critical security issues found! Fix before deployment.${NC}"
    exit 1
fi
