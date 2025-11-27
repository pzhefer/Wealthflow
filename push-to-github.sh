#!/bin/bash

# WealthFlow - GitHub Push Script
# Repository: https://github.com/pzhefer/Wealthflow.git
# Username: pzhefer
# Token: Stored in .github-config (not tracked by git)

echo "🚀 Pushing WealthFlow to GitHub..."
echo ""

# Load GitHub credentials from config file if it exists
if [ -f .github-config ]; then
    source .github-config
    echo "✅ Loaded credentials from .github-config"
else
    # Fall back to environment variables
    GITHUB_USERNAME="${GITHUB_USERNAME:-pzhefer}"
    GITHUB_TOKEN="${GITHUB_TOKEN:-}"
    GITHUB_REPO="${GITHUB_REPO:-https://github.com/pzhefer/Wealthflow.git}"
fi

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Error: GITHUB_TOKEN not found"
    echo ""
    echo "Option 1: Create .github-config file:"
    echo "  echo 'export GITHUB_TOKEN=\"your_token_here\"' > .github-config"
    echo ""
    echo "Option 2: Set environment variable:"
    echo "  export GITHUB_TOKEN='your_token_here'"
    echo "  bash push-to-github.sh"
    exit 1
fi

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing Git repository..."
    git init
    git branch -m main
fi

# Configure git user
git config user.name "pzhefer"
git config user.email "pzhefer@users.noreply.github.com"

# Add all files
echo "📝 Staging files..."
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "ℹ️  No changes to commit"
else
    # Commit changes with timestamp
    COMMIT_MSG="${1:-Update: $(date '+%Y-%m-%d %H:%M:%S')}"
    echo "💾 Committing changes: $COMMIT_MSG"
    git commit -m "$COMMIT_MSG"
fi

# Configure remote with credentials
if ! git remote | grep -q origin; then
    echo "🔗 Adding GitHub remote..."
    git remote add origin "https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/pzhefer/Wealthflow.git"
else
    echo "🔗 Updating GitHub remote..."
    git remote set-url origin "https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/pzhefer/Wealthflow.git"
fi

# Push to GitHub
echo "⬆️  Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🔗 View at: https://github.com/pzhefer/Wealthflow"
else
    echo ""
    echo "❌ Push failed. Please check the error above."
fi
