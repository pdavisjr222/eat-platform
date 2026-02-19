#!/bin/bash

# CI/CD Setup Script for EAT Platform
# This script helps set up the CI/CD pipeline

set -e

echo "=================================="
echo "EAT Platform CI/CD Setup"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required tools are installed
check_command() {
  if ! command -v $1 &> /dev/null; then
    echo -e "${RED}✗${NC} $1 is not installed"
    return 1
  else
    echo -e "${GREEN}✓${NC} $1 is installed"
    return 0
  fi
}

echo "Checking required tools..."
echo ""

check_command "git" || exit 1
check_command "node" || exit 1
check_command "npm" || exit 1
check_command "gh" || echo -e "${YELLOW}⚠${NC} GitHub CLI not installed. Install from: https://cli.github.com/"

echo ""
echo "=================================="
echo "Step 1: Repository Setup"
echo "=================================="
echo ""

# Check if git remote exists
if git remote get-url origin &> /dev/null; then
  REPO_URL=$(git remote get-url origin)
  echo -e "${GREEN}✓${NC} Git remote already configured: $REPO_URL"
else
  echo -e "${YELLOW}⚠${NC} No git remote configured"
  read -p "Enter your GitHub repository URL: " REPO_URL
  git remote add origin $REPO_URL
  echo -e "${GREEN}✓${NC} Git remote added"
fi

echo ""
echo "=================================="
echo "Step 2: Railway Setup"
echo "=================================="
echo ""

if check_command "railway"; then
  echo ""
  read -p "Have you logged into Railway? (y/n): " RAILWAY_LOGGED_IN
  if [ "$RAILWAY_LOGGED_IN" != "y" ]; then
    echo "Run: railway login"
    exit 1
  fi

  echo ""
  read -p "Create Railway token now? (y/n): " CREATE_RAILWAY_TOKEN
  if [ "$CREATE_RAILWAY_TOKEN" = "y" ]; then
    echo "Run the following command and save the token:"
    echo -e "${YELLOW}railway tokens create${NC}"
    echo ""
    read -p "Press Enter when done..."
  fi
else
  echo "Install Railway CLI:"
  echo -e "${YELLOW}npm install -g @railway/cli${NC}"
fi

echo ""
echo "=================================="
echo "Step 3: Vercel Setup"
echo "=================================="
echo ""

if check_command "vercel"; then
  echo ""
  read -p "Have you logged into Vercel? (y/n): " VERCEL_LOGGED_IN
  if [ "$VERCEL_LOGGED_IN" != "y" ]; then
    echo "Run: vercel login"
    exit 1
  fi

  echo ""
  read -p "Link Vercel project now? (y/n): " LINK_VERCEL
  if [ "$LINK_VERCEL" = "y" ]; then
    cd packages/web
    vercel link
    cd ../..
    echo -e "${GREEN}✓${NC} Vercel project linked"
    echo ""
    echo "Get your project details from: packages/web/.vercel/project.json"
  fi
else
  echo "Install Vercel CLI:"
  echo -e "${YELLOW}npm install -g vercel${NC}"
fi

echo ""
echo "=================================="
echo "Step 4: Expo/EAS Setup"
echo "=================================="
echo ""

if check_command "eas"; then
  echo ""
  read -p "Have you logged into Expo? (y/n): " EXPO_LOGGED_IN
  if [ "$EXPO_LOGGED_IN" != "y" ]; then
    echo "Run: eas login"
    exit 1
  fi

  echo ""
  read -p "Configure EAS build now? (y/n): " CONFIGURE_EAS
  if [ "$CONFIGURE_EAS" = "y" ]; then
    cd packages/mobile
    eas build:configure
    cd ../..
    echo -e "${GREEN}✓${NC} EAS configured"
  fi
else
  echo "Install EAS CLI:"
  echo -e "${YELLOW}npm install -g eas-cli${NC}"
fi

echo ""
echo "=================================="
echo "Step 5: GitHub Secrets"
echo "=================================="
echo ""

if check_command "gh"; then
  echo "The following secrets need to be added to GitHub:"
  echo ""
  echo "1. RAILWAY_TOKEN"
  echo "2. VERCEL_TOKEN"
  echo "3. VERCEL_ORG_ID"
  echo "4. VERCEL_PROJECT_ID"
  echo "5. EXPO_TOKEN"
  echo ""

  read -p "Add secrets interactively? (y/n): " ADD_SECRETS
  if [ "$ADD_SECRETS" = "y" ]; then
    echo ""
    read -p "Enter RAILWAY_TOKEN: " RAILWAY_TOKEN
    if [ ! -z "$RAILWAY_TOKEN" ]; then
      gh secret set RAILWAY_TOKEN -b"$RAILWAY_TOKEN"
      echo -e "${GREEN}✓${NC} RAILWAY_TOKEN added"
    fi

    echo ""
    read -p "Enter VERCEL_TOKEN: " VERCEL_TOKEN
    if [ ! -z "$VERCEL_TOKEN" ]; then
      gh secret set VERCEL_TOKEN -b"$VERCEL_TOKEN"
      echo -e "${GREEN}✓${NC} VERCEL_TOKEN added"
    fi

    echo ""
    read -p "Enter VERCEL_ORG_ID: " VERCEL_ORG_ID
    if [ ! -z "$VERCEL_ORG_ID" ]; then
      gh secret set VERCEL_ORG_ID -b"$VERCEL_ORG_ID"
      echo -e "${GREEN}✓${NC} VERCEL_ORG_ID added"
    fi

    echo ""
    read -p "Enter VERCEL_PROJECT_ID: " VERCEL_PROJECT_ID
    if [ ! -z "$VERCEL_PROJECT_ID" ]; then
      gh secret set VERCEL_PROJECT_ID -b"$VERCEL_PROJECT_ID"
      echo -e "${GREEN}✓${NC} VERCEL_PROJECT_ID added"
    fi

    echo ""
    read -p "Enter EXPO_TOKEN: " EXPO_TOKEN
    if [ ! -z "$EXPO_TOKEN" ]; then
      gh secret set EXPO_TOKEN -b"$EXPO_TOKEN"
      echo -e "${GREEN}✓${NC} EXPO_TOKEN added"
    fi
  else
    echo "Add secrets manually in GitHub:"
    echo "Repository → Settings → Secrets and variables → Actions"
  fi
else
  echo "Install GitHub CLI to add secrets programmatically:"
  echo -e "${YELLOW}https://cli.github.com/${NC}"
  echo ""
  echo "Or add secrets manually in GitHub:"
  echo "Repository → Settings → Secrets and variables → Actions"
fi

echo ""
echo "=================================="
echo "Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Review and update README.md with your repository URL"
echo "2. Update eas.json with your Apple/Google credentials"
echo "3. Configure environment variables in Railway/Vercel"
echo "4. Push to GitHub to trigger the first workflow"
echo ""
echo "Documentation: .github/DEPLOYMENT.md"
echo ""
echo -e "${GREEN}Happy deploying!${NC}"
