terraform {
  required_version = ">= 1.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  # API token should be set via environment variable:
  # export CLOUDFLARE_API_TOKEN="your-api-token"
  # Or use api_key and email (legacy)
}

# Variables
variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID (optional, for custom domain)"
  type        = string
  default     = ""
}

variable "worker_name" {
  description = "Name of the Cloudflare Worker"
  type        = string
  default     = "remarkable-canvas"
}

variable "domain_name" {
  description = "Custom domain for the worker (optional)"
  type        = string
  default     = ""
}

variable "subdomain" {
  description = "Subdomain for the worker (optional)"
  type        = string
  default     = "canvas"
}

# Read the worker script
locals {
  worker_script = file("${path.module}/../cloudflare/worker.js")
}

# Cloudflare Worker Script
resource "cloudflare_workers_script" "remarkable_canvas" {
  account_id = var.cloudflare_account_id
  name       = var.worker_name
  content    = local.worker_script

  # Durable Objects binding
  durable_object_namespace_binding {
    name      = "CANVAS_ROOM"
    class_name = "CanvasRoom"
    script_name = var.worker_name
  }

  # Optional: KV namespace binding for persistent storage
  # kv_namespace_binding {
  #   name         = "CANVAS_STORAGE"
  #   namespace_id = cloudflare_workers_kv_namespace.canvas_storage.id
  # }
}

# Optional: Custom domain route
resource "cloudflare_worker_route" "remarkable_canvas" {
  count       = var.domain_name != "" && var.cloudflare_zone_id != "" ? 1 : 0
  zone_id     = var.cloudflare_zone_id
  pattern     = "${var.subdomain}.${var.domain_name}/*"
  script_name = cloudflare_workers_script.remarkable_canvas.name
}

# Optional: Workers domain (*.workers.dev)
resource "cloudflare_workers_domain" "remarkable_canvas" {
  account_id = var.cloudflare_account_id
  hostname   = "${var.worker_name}.workers.dev"
  service    = var.worker_name
  environment = "production"
}

# Optional: KV Namespace for persistent storage
# resource "cloudflare_workers_kv_namespace" "canvas_storage" {
#   account_id = var.cloudflare_account_id
#   title      = "remarkable-canvas-storage"
# }

# Outputs
output "worker_url" {
  description = "URL of the deployed worker"
  value       = "https://${var.worker_name}.workers.dev"
}

output "custom_domain_url" {
  description = "Custom domain URL (if configured)"
  value       = var.domain_name != "" ? "https://${var.subdomain}.${var.domain_name}" : "Not configured"
}

output "worker_name" {
  description = "Name of the deployed worker"
  value       = cloudflare_workers_script.remarkable_canvas.name
}
