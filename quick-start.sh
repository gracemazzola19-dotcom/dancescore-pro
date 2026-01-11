#!/bin/bash

# DanceScore Pro Quick Start Script
# This script helps you get DanceScore Pro running quickly

echo "🎭 DanceScore Pro - Quick Start Setup"
echo "====================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm run install-all

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Set up environment file
echo ""
echo "⚙️  Setting up environment configuration..."

if [ ! -f "server/.env" ]; then
    cp server/.env.example server/.env
    echo "✅ Created server/.env file"
    echo "⚠️  Please edit server/.env with your Firebase configuration"
else
    echo "✅ server/.env already exists"
fi

# Create uploads directory
mkdir -p server/uploads
echo "✅ Created uploads directory"

echo ""
echo "🚀 Setup complete! Next steps:"
echo ""
echo "1. Configure Firebase:"
echo "   - Create a Firebase project at https://console.firebase.google.com/"
echo "   - Enable Firestore Database"
echo "   - Generate a service account key"
echo "   - Add the key path to server/.env"
echo ""
echo "2. Start the development servers:"
echo "   npm run dev"
echo ""
echo "3. Open your browser to:"
echo "   http://localhost:3000"
echo ""
echo "4. Login with demo credentials:"
echo "   Judge: judge@dancescore.com / judge123"
echo "   Admin: admin@dancescore.com / admin123"
echo ""
echo "📚 For detailed setup instructions, see:"
echo "   - README.md"
echo "   - DEPLOYMENT_GUIDE.md"
echo "   - DATABASE_SCHEMA.md"
echo ""
echo "🎉 Happy dancing!"
