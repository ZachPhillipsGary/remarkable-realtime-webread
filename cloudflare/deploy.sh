#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== reMarkable Canvas - Cloudflare Deployment ===${NC}\n"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}Wrangler CLI not found. Installing...${NC}"
    npm install -g wrangler
fi

# Check if logged in
echo -e "${YELLOW}Checking Cloudflare authentication...${NC}"
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}Not logged in to Cloudflare. Please authenticate:${NC}"
    wrangler login
fi

# Change to cloudflare directory
cd "$(dirname "$0")"

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Deploy
echo -e "\n${GREEN}Deploying to Cloudflare Workers...${NC}"
wrangler deploy

# Get the deployed URL
echo -e "\n${GREEN}✓ Deployment successful!${NC}\n"
echo -e "Your worker is deployed at:"
echo -e "${GREEN}https://remarkable-canvas.workers.dev${NC}"
echo -e "\nYou can also view it in the Cloudflare dashboard:"
echo -e "${YELLOW}https://dash.cloudflare.com/?to=/:account/workers${NC}"
echo -e "\nTo test with your reMarkable device:"
echo -e "ssh root@10.11.99.1"
echo -e "./remarkable-canvas -s wss://remarkable-canvas.workers.dev"
