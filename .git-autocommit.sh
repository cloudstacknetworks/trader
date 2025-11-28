#!/bin/bash
# Auto-commit helper script for News Trader
# This script commits and pushes changes to GitHub

set -e

cd "$(dirname "$0")"

# Check if there are any changes
if [[ -z $(git status -s) ]]; then
  echo "No changes to commit"
  exit 0
fi

# Get commit message from argument or use default
COMMIT_MSG="${1:-Auto-commit: Updates from development session}"

# Add all changes
git add -A

# Commit with message
git commit -m "$COMMIT_MSG"

# Push to main branch
git push origin main

echo "✅ Changes committed and pushed successfully"
