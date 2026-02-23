#!/bin/bash
# Build script for iOS app
# Usage: ./build-ios.sh [dev|prod]

set -e

MODE="${1:-prod}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  CulturiaQuests - iOS Build            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

if [ "$MODE" = "dev" ]; then
    echo -e "${YELLOW}[1/3] Building in DEVELOPMENT mode...${NC}"
    npm run build
else
    echo -e "${YELLOW}[1/3] Building in PRODUCTION mode...${NC}"
    npm run generate
fi
echo -e "${GREEN}  ✓ Build completed${NC}"

echo -e "${YELLOW}[2/3] Syncing with Capacitor...${NC}"
npx cap sync ios
echo -e "${GREEN}  ✓ Sync completed${NC}"

echo -e "${YELLOW}[3/3] Opening Xcode...${NC}"
npx cap open ios || echo -e "${YELLOW}  ⚠ Xcode not installed - skip this step${NC}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Build process completed!              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}To build IPA from Xcode:${NC}"
echo -e "  1. Select your team in Signing & Capabilities"
echo -e "  2. Product > Archive"
echo -e "  3. Distribute App"
echo ""
