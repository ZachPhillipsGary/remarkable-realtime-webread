#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== reMarkable Canvas - Terraform Deployment ===${NC}\n"

# Change to terraform directory
cd "$(dirname "$0")"

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}ERROR: Terraform is not installed${NC}"
    echo -e "Please install Terraform from: https://www.terraform.io/downloads.html"
    exit 1
fi

# Check for terraform.tfvars
if [ ! -f "terraform.tfvars" ]; then
    echo -e "${YELLOW}WARNING: terraform.tfvars not found${NC}"
    echo -e "Creating from template..."
    cp terraform.tfvars.example terraform.tfvars
    echo -e "${RED}Please edit terraform.tfvars with your Cloudflare credentials${NC}"
    echo -e "Required values:"
    echo -e "  - cloudflare_account_id"
    echo -e "\nOptional values:"
    echo -e "  - cloudflare_zone_id (for custom domain)"
    echo -e "  - domain_name (for custom domain)"
    echo -e "  - subdomain (for custom domain)"
    exit 1
fi

# Check for Cloudflare API token
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${YELLOW}WARNING: CLOUDFLARE_API_TOKEN environment variable not set${NC}"
    echo -e "Please set it with:"
    echo -e "  export CLOUDFLARE_API_TOKEN='your-api-token'"
    echo -e "\nCreate a token at: https://dash.cloudflare.com/profile/api-tokens"
    echo -e "Required permissions: Workers Scripts - Edit"
    exit 1
fi

# Initialize Terraform
echo -e "${BLUE}Initializing Terraform...${NC}"
terraform init

# Validate configuration
echo -e "\n${BLUE}Validating configuration...${NC}"
terraform validate

# Plan
echo -e "\n${BLUE}Planning deployment...${NC}"
terraform plan -out=tfplan

# Apply
echo -e "\n${YELLOW}Ready to deploy. Continue? (yes/no)${NC}"
read -r response
if [[ "$response" != "yes" ]]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 0
fi

echo -e "\n${BLUE}Applying configuration...${NC}"
terraform apply tfplan

# Clean up plan file
rm -f tfplan

# Show outputs
echo -e "\n${GREEN}=== Deployment Complete ===${NC}\n"
terraform output

echo -e "\n${GREEN}Next steps:${NC}"
echo -e "1. Test your worker in a browser"
echo -e "2. Deploy to reMarkable: ${YELLOW}make deploy REMARKABLE_IP=10.11.99.1${NC}"
echo -e "3. Connect from reMarkable: ${YELLOW}./remarkable-canvas -s wss://YOUR_WORKER_URL${NC}"
