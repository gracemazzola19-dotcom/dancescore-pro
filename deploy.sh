#!/bin/bash
# DanceScore Pro Deployment Script

echo "🚀 DanceScore Pro - Deployment Script"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Git repository not initialized${NC}"
    echo "Initializing git repository..."
    git init
fi

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo -e "${YELLOW}⚠️  Heroku CLI not found${NC}"
    echo ""
    echo "Please install Heroku CLI first:"
    echo "  macOS: brew tap heroku/brew && brew install heroku"
    echo "  Or visit: https://devcenter.heroku.com/articles/heroku-cli"
    echo ""
    echo "Alternatively, you can deploy to other platforms:"
    echo "  - Railway: https://railway.app"
    echo "  - Render: https://render.com"
    echo "  - Vercel + Railway: Frontend on Vercel, Backend on Railway"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Heroku CLI found${NC}"

# Check if user is logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Heroku${NC}"
    echo "Logging in..."
    heroku login
fi

echo -e "${GREEN}✅ Logged in to Heroku${NC}"

# Check if app exists
echo ""
read -p "Do you already have a Heroku app? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter your Heroku app name: " APP_NAME
    heroku git:remote -a $APP_NAME
else
    read -p "Enter name for new Heroku app (or press Enter for auto-generated): " APP_NAME
    if [ -z "$APP_NAME" ]; then
        heroku create
    else
        heroku create $APP_NAME
    fi
    APP_NAME=$(heroku apps:info --json 2>/dev/null | grep -o '"name":"[^"]*' | cut -d'"' -f4 || echo "")
fi

echo ""
echo -e "${BLUE}📦 Preparing deployment...${NC}"

# Build client
echo "Building client..."
cd client
npm install
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Client build failed${NC}"
    exit 1
fi
cd ..

echo -e "${GREEN}✅ Client built successfully${NC}"

# Stage files
echo "Staging files for git..."
git add .
git commit -m "Deploy DanceScore Pro" || echo "No changes to commit"

echo ""
echo -e "${BLUE}⚙️  Setting up environment variables...${NC}"
echo ""
echo "We need to set the following environment variables on Heroku:"
echo "  - JWT_SECRET"
echo "  - SMTP_HOST"
echo "  - SMTP_PORT"
echo "  - SMTP_USER"
echo "  - SMTP_PASSWORD"
echo "  - SMTP_FROM"
echo "  - NODE_ENV=production"
echo ""

# Check if env vars are set
read -p "Do you want to set environment variables now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Read from .env file if it exists
    if [ -f "server/.env" ]; then
        source server/.env 2>/dev/null || true
        
        if [ ! -z "$JWT_SECRET" ]; then
            heroku config:set JWT_SECRET="$JWT_SECRET"
        fi
        if [ ! -z "$SMTP_HOST" ]; then
            heroku config:set SMTP_HOST="$SMTP_HOST"
        fi
        if [ ! -z "$SMTP_PORT" ]; then
            heroku config:set SMTP_PORT="$SMTP_PORT"
        fi
        if [ ! -z "$SMTP_USER" ]; then
            heroku config:set SMTP_USER="$SMTP_USER"
        fi
        if [ ! -z "$SMTP_PASSWORD" ]; then
            heroku config:set SMTP_PASSWORD="$SMTP_PASSWORD"
        fi
        if [ ! -z "$SMTP_FROM" ]; then
            heroku config:set SMTP_FROM="$SMTP_FROM"
        fi
    fi
    
    heroku config:set NODE_ENV="production"
    
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Service Account Key${NC}"
    echo "You need to upload your Firebase service account key to Heroku."
    echo "Options:"
    echo "  1. Convert to environment variable:"
    echo "     heroku config:set GOOGLE_APPLICATION_CREDENTIALS_JSON='$(cat server/service-account-key.json | jq -c)'"
    echo ""
    echo "  2. Or modify code to read from config var instead of file"
    echo ""
    read -p "Have you set up the service account key? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⚠️  Please set up the service account key before deploying${NC}"
    fi
fi

echo ""
echo -e "${BLUE}🚀 Deploying to Heroku...${NC}"
git push heroku main

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "Your app is available at:"
    heroku open
    echo ""
    echo "To view logs:"
    echo "  heroku logs --tail"
    echo ""
    echo "To check app status:"
    echo "  heroku ps"
    echo ""
    echo "Don't forget to:"
    echo "  1. Test the deployed app"
    echo "  2. Verify email verification works"
    echo "  3. Test all critical features"
    echo "  4. Monitor logs for errors"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    echo "Check the error messages above"
    exit 1
fi
