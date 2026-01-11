#!/bin/bash
# Script to update and redeploy the application

echo "🔄 Update and Deploy Script"
echo "============================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Security audit
echo "1. Running security audit..."
if ./security-audit.sh; then
    echo -e "${GREEN}✅ Security check passed${NC}"
else
    echo -e "${RED}❌ Security issues found. Fix them before deploying.${NC}"
    exit 1
fi
echo ""

# Step 2: Test deployment readiness
echo "2. Testing deployment readiness..."
if ./test-deployment.sh; then
    echo -e "${GREEN}✅ Deployment readiness test passed${NC}"
else
    echo -e "${RED}❌ Deployment tests failed. Fix issues before deploying.${NC}"
    exit 1
fi
echo ""

# Step 3: Build client
echo "3. Building client..."
cd client
if npm run build; then
    echo -e "${GREEN}✅ Client build successful${NC}"
else
    echo -e "${RED}❌ Client build failed${NC}"
    exit 1
fi
cd ..
echo ""

# Step 4: Check git status
echo "4. Checking git status..."
if [ -d .git ]; then
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
        echo "   Changes:"
        git status --short
        echo ""
        read -p "Do you want to commit these changes? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "Enter commit message: " COMMIT_MSG
            git add .
            git commit -m "$COMMIT_MSG"
            echo -e "${GREEN}✅ Changes committed${NC}"
        fi
    else
        echo -e "${GREEN}✅ No uncommitted changes${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Not a git repository${NC}"
    echo "   Initialize git first: git init"
fi
echo ""

# Step 5: Deploy (if Heroku)
if command -v heroku &> /dev/null; then
    echo "5. Deploying to Heroku..."
    read -p "Deploy to Heroku now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if git remote | grep -q heroku; then
            git push heroku main
            echo -e "${GREEN}✅ Deployed to Heroku!${NC}"
        else
            echo -e "${YELLOW}⚠️  No Heroku remote found${NC}"
            echo "   Set up Heroku first: heroku git:remote -a your-app-name"
        fi
    else
        echo -e "${YELLOW}⚠️  Skipping deployment${NC}"
    fi
else
    echo "5. Heroku CLI not found. Deploy manually using your platform's method."
fi

echo ""
echo "============================"
echo -e "${GREEN}✅ Update process complete!${NC}"
echo ""
echo "Next steps:"
echo "  - Test your deployed site"
echo "  - Monitor logs for errors"
echo "  - Verify all features work"
