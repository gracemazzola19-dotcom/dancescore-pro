#!/bin/bash
# Push code to GitHub

cd /Users/gracemazzola/dancescore-pro

echo "🚀 Pushing code to GitHub..."
echo ""

# The remote should already be added, but let's verify
echo "Checking git remote..."
git remote -v

echo ""
echo "Now pushing to GitHub..."
echo "You'll be prompted for your GitHub username and password"
echo ""

git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Your code is now on GitHub!"
    echo ""
    echo "Next step: Deploy on Railway"
    echo "Go to: https://railway.app"
else
    echo ""
    echo "❌ Error pushing to GitHub"
    echo "Check your username and password"
fi
