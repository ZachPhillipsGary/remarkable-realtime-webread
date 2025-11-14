# Terraform Deployment for Cloudflare Workers

Infrastructure-as-Code deployment for the reMarkable Real-time Canvas on Cloudflare Workers.

## Why Terraform?

- **Version Control**: Track infrastructure changes in git
- **Reproducible**: Deploy identical infrastructure across accounts
- **Team Collaboration**: Share infrastructure configuration
- **State Management**: Track deployed resources
- **Advanced Configuration**: Fine-grained control over Cloudflare settings

## Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) >= 1.0
- Cloudflare account
- Cloudflare API token with Workers permissions

## Quick Start

### 1. Install Terraform

```bash
# macOS
brew install terraform

# Linux
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Windows
choco install terraform
```

### 2. Get Cloudflare Credentials

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **My Profile** → **API Tokens**
3. Click **Create Token**
4. Use the "Edit Cloudflare Workers" template
5. Copy the token

### 3. Configure Deployment

```bash
cd terraform

# Copy example configuration
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

Set these required values in `terraform.tfvars`:

```hcl
cloudflare_account_id = "your-account-id-here"
```

Find your account ID:
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click on **Workers & Pages**
3. Account ID is shown on the right sidebar

### 4. Set API Token

```bash
export CLOUDFLARE_API_TOKEN="your-api-token-here"
```

Or add to your shell profile:

```bash
# ~/.bashrc or ~/.zshrc
export CLOUDFLARE_API_TOKEN="your-api-token-here"
```

### 5. Deploy

#### Option A: Automated Script

```bash
./deploy.sh
```

#### Option B: Manual Steps

```bash
# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Deploy
terraform apply
```

## Configuration Options

### Basic Deployment (workers.dev subdomain)

```hcl
cloudflare_account_id = "abc123..."
worker_name           = "remarkable-canvas"
```

Result: `https://remarkable-canvas.workers.dev`

### Custom Domain Deployment

```hcl
cloudflare_account_id = "abc123..."
cloudflare_zone_id    = "xyz789..."
worker_name           = "remarkable-canvas"
domain_name           = "example.com"
subdomain             = "canvas"
```

Result: `https://canvas.example.com`

## Outputs

After deployment, Terraform displays:

```
worker_url = "https://remarkable-canvas.workers.dev"
custom_domain_url = "https://canvas.example.com"
worker_name = "remarkable-canvas"
```

## Managing Infrastructure

### View Current State

```bash
terraform show
```

### Update Configuration

1. Edit `terraform.tfvars` or `main.tf`
2. Preview changes: `terraform plan`
3. Apply changes: `terraform apply`

### Destroy Infrastructure

```bash
terraform destroy
```

## Advanced Configuration

### Multiple Environments

Create separate `.tfvars` files:

```bash
# Production
terraform apply -var-file="production.tfvars"

# Staging
terraform apply -var-file="staging.tfvars"
```

Example `production.tfvars`:

```hcl
cloudflare_account_id = "abc123..."
worker_name           = "remarkable-canvas-prod"
domain_name           = "example.com"
subdomain             = "canvas"
```

Example `staging.tfvars`:

```hcl
cloudflare_account_id = "abc123..."
worker_name           = "remarkable-canvas-staging"
domain_name           = "example.com"
subdomain             = "canvas-staging"
```

### Remote State

Store Terraform state in cloud storage:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "remarkable-canvas/terraform.tfstate"
    region = "us-east-1"
  }
}
```

Or use Terraform Cloud:

```hcl
terraform {
  cloud {
    organization = "my-org"
    workspaces {
      name = "remarkable-canvas"
    }
  }
}
```

### Custom DNS Records

Add A/AAAA records for custom domain:

```hcl
resource "cloudflare_record" "canvas" {
  zone_id = var.cloudflare_zone_id
  name    = var.subdomain
  type    = "A"
  value   = "192.0.2.1"  # Cloudflare Worker IP
  proxied = true
}
```

### KV Namespace for Persistent Storage

Uncomment in `main.tf`:

```hcl
resource "cloudflare_workers_kv_namespace" "canvas_storage" {
  account_id = var.cloudflare_account_id
  title      = "remarkable-canvas-storage"
}
```

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/terraform.yml`:

```yaml
name: Terraform Deploy

on:
  push:
    branches: [main]
    paths: ['terraform/**']

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.0

      - name: Terraform Init
        working-directory: ./terraform
        run: terraform init
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Terraform Apply
        working-directory: ./terraform
        run: terraform apply -auto-approve
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          TF_VAR_cloudflare_account_id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### GitLab CI

```yaml
# .gitlab-ci.yml
terraform:
  image: hashicorp/terraform:1.6
  script:
    - cd terraform
    - terraform init
    - terraform plan
    - terraform apply -auto-approve
  only:
    - main
  environment:
    name: production
```

## Troubleshooting

### "Error: Account ID is invalid"

- Verify account ID in Cloudflare dashboard
- Check `terraform.tfvars` has correct value
- Ensure no extra spaces or quotes

### "Error: Authentication error"

```bash
# Check token is set
echo $CLOUDFLARE_API_TOKEN

# Verify token has correct permissions
# Should have: Workers Scripts - Edit
```

### "Error: Zone not found"

- Verify `cloudflare_zone_id` is correct
- Ensure domain is added to Cloudflare
- Check domain is active (not pending)

### State Lock Issues

```bash
# Force unlock (use with caution)
terraform force-unlock <LOCK_ID>
```

### Import Existing Resources

If you already deployed with Wrangler:

```bash
# Import existing worker
terraform import cloudflare_workers_script.remarkable_canvas \
  <account_id>/remarkable-canvas
```

## State Management

### View State

```bash
terraform state list
terraform state show cloudflare_workers_script.remarkable_canvas
```

### Backup State

```bash
cp terraform.tfstate terraform.tfstate.backup
```

### Restore State

```bash
cp terraform.tfstate.backup terraform.tfstate
```

## Variables Reference

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `cloudflare_account_id` | string | Yes | - | Cloudflare account ID |
| `cloudflare_zone_id` | string | No | "" | Zone ID for custom domain |
| `worker_name` | string | No | "remarkable-canvas" | Worker name |
| `domain_name` | string | No | "" | Custom domain |
| `subdomain` | string | No | "canvas" | Subdomain prefix |

## Resources Created

- `cloudflare_workers_script.remarkable_canvas` - The worker script
- `cloudflare_worker_route.remarkable_canvas` - Route (if custom domain)
- `cloudflare_workers_domain.remarkable_canvas` - Workers.dev domain

## Best Practices

1. **Version Control**: Commit `*.tf` files, ignore `*.tfstate`
2. **Secrets**: Never commit `terraform.tfvars` with credentials
3. **Plan First**: Always run `terraform plan` before `apply`
4. **State Backup**: Regularly backup `terraform.tfstate`
5. **Remote State**: Use remote state for team collaboration

## Migration from Wrangler

To migrate existing Wrangler deployment to Terraform:

1. Export current configuration
2. Import resources: `terraform import ...`
3. Run `terraform plan` to verify
4. Continue using Terraform for updates

## Cost Tracking

Add tags for cost tracking:

```hcl
resource "cloudflare_workers_script" "remarkable_canvas" {
  # ... existing config ...

  tags = ["project:remarkable-canvas", "env:production"]
}
```

## Resources

- [Terraform Cloudflare Provider Docs](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
- [Cloudflare Workers Terraform Examples](https://github.com/cloudflare/terraform-provider-cloudflare/tree/master/examples)

## Getting Help

1. Check [Terraform Cloudflare Provider Issues](https://github.com/cloudflare/terraform-provider-cloudflare/issues)
2. Consult [Terraform Documentation](https://www.terraform.io/docs)
3. Ask in [Cloudflare Community](https://community.cloudflare.com/)
4. Open issue in this repository
