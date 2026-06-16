output "resource_group_name" {
  description = "Azure resource group name."
  value       = azurerm_resource_group.main.name
}

output "container_registry_login_server" {
  description = "ACR login server for pushing the backend image."
  value       = azurerm_container_registry.main.login_server
}

output "key_vault_name" {
  description = "Key Vault name for application secrets."
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "Key Vault URI for application secrets."
  value       = azurerm_key_vault.main.vault_uri
}

output "backend_image" {
  description = "Container image configured for the backend Container App."
  value       = local.backend_image
}

output "container_app_name" {
  description = "Backend Container App name."
  value       = azurerm_container_app.api.name
}

output "container_app_fqdn" {
  description = "Backend public FQDN."
  value       = azurerm_container_app.api.ingress[0].fqdn
}

output "postgres_server_fqdn" {
  description = "PostgreSQL Flexible Server FQDN."
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "postgres_database_name" {
  description = "PostgreSQL application database name."
  value       = azurerm_postgresql_flexible_server_database.app.name
}

output "postgres_admin_login" {
  description = "PostgreSQL administrator login."
  value       = var.postgres_admin_login
}

output "storage_account_name" {
  description = "Storage account used for uploads."
  value       = azurerm_storage_account.main.name
}

output "uploads_share_name" {
  description = "Azure Files share mounted at /uploads."
  value       = azurerm_storage_share.uploads.name
}
