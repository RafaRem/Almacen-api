tenant_id       = "19767c7d-34c4-415c-9a1d-45ccfb89a3dd"
subscription_id = "5e3f35c0-0fe2-40db-a778-723c73670c4c"

key_vault_secrets_officer_principal_id = "2e151b35-6a85-47e8-855f-4b4623a7cd62"

project_name = "nueva-era"
environment  = "prod"
location     = "eastus"

container_apps_location = "eastus2"
postgres_location       = "eastus2"

postgres_sku_name   = "B_Standard_B1ms"
postgres_storage_mb = 32768
postgres_zone       = "1"

allow_public_networks_to_postgres = true

container_min_replicas = 0
container_max_replicas = 2
container_cpu          = 0.5
container_memory       = "1Gi"
container_target_port  = 3000
build_backend_image    = false
