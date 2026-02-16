#!/bin/bash
set -e

# Confirm with user
read -p "This will remove the current .git directory and re-initialize the repository to clean up history. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo "Cleaning up .git directory..."
rm -rf .git

echo "Initializing new git repository..."
git init

echo "Adding files (respecting .gitignore)..."
git add .

echo "Committing..."
git commit -m "Initial commit"

echo "Adding remote..."
git remote add origin https://github.com/harsha8688/MissNova.git

echo "Renaming branch to main..."
git branch -M main

echo "Pushing to remote..."
git push -u origin main --force

echo "Done! Repository is clean and pushed."
