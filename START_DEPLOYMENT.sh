#!/bin/bash
# DanceScore Pro - Start Deployment Script

echo "🚀 Starting DanceScore Pro Deployment"
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo -e "${YELLOW}⚠️  Heroku CLI not found${NC}"
    echo ""
    echo "Installing Heroku CLI..."
    
    # Check if Homebrew is installed
    if command -v brew &> /dev/null; then
        echo -e "${BLUE}📦 Installing via Homebrew...${NC}"
        brew tap heroku/brew
        brew install heroku
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Heroku CLI installed successfully${NC}"
        else
            echo -e "${RED}❌ Installation failed${NC}"
            echo ""
            echo "Please install manually:"
            echo "  Visit: https://devcenter.heroku.com/articles/heroku-cli"
            exit 1
        fi
    else
        echo -e "${RED}❌ Homebrew not found${NC}"
        echo ""
        echo "Please install Heroku CLI manually:"
        echo "  1. Visit: https://devcenter.heroku.com/articles/heroku-cli"
        echo "  2. Or install Homebrew first: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
else
    echo -e "${GREEN}✅ Heroku CLI found: $(heroku --version)${NC}"
fi

echo ""
echo -e "${BLUE}🔐 Logging in to Heroku...${NC}"
echo "If a browser window opens, please login there."
echo ""

heroku login

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Login failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Logged in to Heroku${NC}"

echo ""
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check if build exists
if [ ! -d "client/build" ]; then
    echo -e "${YELLOW}⚠️  Build directory not found. Building now...${NC}"
    cd client
    npm install
    npm run build
    cd ..
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Build completed${NC}"
else
    echo -e "${GREEN}✅ Build directory exists${NC}"
fi

# Check if jq is installed (for JSON processing)
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq not found (needed for service account key)${NC}"
    if command -v brew &> /dev/null; then
        read -p "Install jq? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            brew install jq
        fi
    fi
fi

echo ""
echo -e "${GREEN}✅ All prerequisites checked${NC}"
echo ""
echo -e "${BLUE}📝 Ready to deploy!${NC}"
echo ""
echo "Next steps:"
echo "  1. Create a Heroku app (or use existing)"
echo "  2. Set environment variables"
echo "  3. Upload service account key"
echo "  4. Deploy!"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Run the main deployment script
./deploy.sh
