variable "tenant_id" {
  description = "Azure tenant ID that must be used for this project."
  type        = string
}

variable "subscription_id" {
  description = "Azure subscription ID that must be used for this project."
  type        = string
}

variable "key_vault_secrets_officer_principal_id" {
  description = "Stable Azure AD principal ID that receives Key Vault Secrets Officer for local secret management. Defaults to the caller only for one-off local bootstraps."
  type        = string
  default     = null
}

variable "project_name" {
  description = "Short project name used in Azure resource names."
  type        = string
  default     = "nueva-era"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "prod"
}

variable "location" {
  description = "Default Azure region for project resources."
  type        = string
  default     = "eastus"
}

variable "container_apps_location" {
  description = "Azure region for the Container Apps environment. Leave null to use location."
  type        = string
  default     = null
}

variable "postgres_location" {
  description = "Azure region for PostgreSQL Flexible Server. Leave null to use location."
  type        = string
  default     = null
}

variable "postgres_sku_name" {
  description = "Azure Database for PostgreSQL Flexible Server SKU. Cheap starting point: B_Standard_B1ms. Safer small production point: B_Standard_B2s."
  type        = string
  default     = "B_Standard_B1ms"
}

variable "postgres_storage_mb" {
  description = "PostgreSQL storage in MB. 32768 is the lowest practical production-sized allocation."
  type        = number
  default     = 32768
}

variable "postgres_version" {
  description = "PostgreSQL major version."
  type        = string
  default     = "16"
}

variable "postgres_zone" {
  description = "Availability zone for PostgreSQL Flexible Server."
  type        = string
  default     = "1"
}

variable "postgres_admin_login" {
  description = "PostgreSQL administrator login."
  type        = string
  default     = "almacenadmin"
}

variable "postgres_admin_password" {
  description = "PostgreSQL administrator password. Pass via TF_VAR_postgres_admin_password for apply; Terraform uses the write-only provider field."
  type        = string
  sensitive   = true
  ephemeral   = true
  nullable    = false
}

variable "postgres_admin_password_version" {
  description = "Increment this integer when rotating the PostgreSQL administrator password."
  type        = number
  default     = 1
}

variable "postgres_database_name" {
  description = "Application database name."
  type        = string
  default     = "almacen"
}

variable "allow_azure_services_to_postgres" {
  description = "Allow Azure-hosted services to connect to PostgreSQL through the public endpoint."
  type        = bool
  default     = true
}

variable "allow_public_networks_to_postgres" {
  description = "Allow PostgreSQL connections from any public IP. Authentication is still required."
  type        = bool
  default     = true
}

variable "postgres_allowed_ip_ranges" {
  description = "Optional public IP ranges allowed to connect to PostgreSQL. Example: { office = { start = \"1.2.3.4\", end = \"1.2.3.4\" } }"
  type = map(object({
    start = string
    end   = string
  }))
  default = {}
}

variable "backend_image_name" {
  description = "Container image repository name inside Azure Container Registry."
  type        = string
  default     = "almacen-api"
}

variable "backend_image_tag" {
  description = "Container image tag to deploy."
  type        = string
  default     = "latest"
}

variable "postgres_admin_password_secret_name" {
  description = "Key Vault secret name containing the PostgreSQL administrator password."
  type        = string
  default     = "postgres-admin-password"
}

variable "jwt_secret_name" {
  description = "Key Vault secret name containing the JWT signing secret."
  type        = string
  default     = "jwt-secret"
}

variable "github_token_secret_name" {
  description = "Key Vault secret name containing the GitHub access token used by the backend."
  type        = string
  default     = "github-token"
}

variable "backend_container_image" {
  description = "Optional full container image override. If null, uses the ACR image created by this stack."
  type        = string
  default     = null
}

variable "build_backend_image" {
  description = "Build and push the backend image with az acr build during terraform apply when backend_container_image is null. Prefer false when CI/CD publishes images."
  type        = bool
  default     = false
}

variable "container_cpu" {
  description = "CPU allocated to the backend container."
  type        = number
  default     = 0.5
}

variable "container_memory" {
  description = "Memory allocated to the backend container."
  type        = string
  default     = "1Gi"
}

variable "container_min_replicas" {
  description = "Minimum backend replicas. Use 0 for lowest cost, 1 to avoid cold starts."
  type        = number
  default     = 0
}

variable "container_max_replicas" {
  description = "Maximum backend replicas."
  type        = number
  default     = 2
}

variable "container_target_port" {
  description = "Port exposed by the NestJS backend container."
  type        = number
  default     = 3000
}

variable "health_probe_path" {
  description = "HTTP path used by Container Apps startup, readiness, and liveness probes."
  type        = string
  default     = "/health"
}

variable "redis_host" {
  description = "Redis host. Leave localhost to keep Redis optional until a managed Redis instance is added."
  type        = string
  default     = "localhost"
}

variable "redis_port" {
  description = "Redis port."
  type        = number
  default     = 6379
}

variable "github_repository" {
  description = "GitHub repository allowed to deploy through OIDC, in owner/name format."
  type        = string
  default     = "RafaRem/Almacen-api"
}

variable "github_environment_name" {
  description = "GitHub environment name used in the OIDC federated credential subject."
  type        = string
  default     = "prod"
}

variable "tags" {
  description = "Tags applied to Azure resources."
  type        = map(string)
  default = {
    managed-by = "terraform"
    project    = "nueva-era"
  }
}
