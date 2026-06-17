data "azurerm_client_config" "current" {}

resource "random_string" "suffix" {
  length  = 6
  lower   = true
  numeric = true
  special = false
  upper   = false
}

locals {
  base_name = lower(replace("${var.project_name}-${var.environment}", "_", "-"))
  suffix    = random_string.suffix.result

  container_apps_location = coalesce(var.container_apps_location, var.location)
  postgres_location       = coalesce(var.postgres_location, var.location)

  resource_group_name    = "rg-${local.base_name}"
  container_app_name     = "ca-api-${local.base_name}"
  container_env_name     = "cae-${local.base_name}-${local.container_apps_location}"
  key_vault_name         = substr(replace("kv-${var.project_name}-${var.environment}-${local.suffix}", "_", "-"), 0, 24)
  log_analytics_name     = "log-${local.base_name}"
  postgres_server_name   = "psql-${local.base_name}-${local.postgres_location}-${local.suffix}"
  acr_name               = substr(replace("acr${var.project_name}${var.environment}${local.suffix}", "-", ""), 0, 50)
  storage_account_name   = substr(replace("st${var.project_name}${var.environment}${local.suffix}", "-", ""), 0, 24)
  uploads_share_name     = "uploads"
  backend_source_dir     = abspath("${path.module}/../..")
  backend_image_default  = "${azurerm_container_registry.main.login_server}/${var.backend_image_name}:${var.backend_image_tag}"
  backend_image          = coalesce(var.backend_container_image, local.backend_image_default)
  github_actions_subject = "repo:${var.github_repository}:environment:${var.github_environment_name}"

  common_tags = merge(var.tags, {
    environment = var.environment
  })
}

resource "azurerm_resource_group" "main" {
  name     = local.resource_group_name
  location = var.location
  tags     = local.common_tags
}

resource "azurerm_log_analytics_workspace" "main" {
  name                = local.log_analytics_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.common_tags
}

resource "azurerm_container_registry" "main" {
  name                = local.acr_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Basic"
  admin_enabled       = false
  tags                = local.common_tags
}

resource "azurerm_user_assigned_identity" "container_apps" {
  name                = "id-${local.base_name}-container-apps"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.common_tags
}

resource "azurerm_user_assigned_identity" "github_actions" {
  name                = "id-${local.base_name}-github-actions"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.common_tags
}

resource "azurerm_federated_identity_credential" "github_actions_prod" {
  name                      = "github-actions-${var.github_environment_name}"
  user_assigned_identity_id = azurerm_user_assigned_identity.github_actions.id
  audience                  = ["api://AzureADTokenExchange"]
  issuer                    = "https://token.actions.githubusercontent.com"
  subject                   = local.github_actions_subject
}

resource "azurerm_key_vault" "main" {
  name                       = local.key_vault_name
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  rbac_authorization_enabled = true
  soft_delete_retention_days = 7
  purge_protection_enabled   = false
  tags                       = local.common_tags
}

resource "azurerm_role_assignment" "current_user_key_vault_secrets_officer" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "container_apps_key_vault_secrets_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.container_apps.principal_id
}

resource "azurerm_role_assignment" "container_apps_acr_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.container_apps.principal_id
}

resource "azurerm_role_assignment" "github_actions_acr_push" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPush"
  principal_id         = azurerm_user_assigned_identity.github_actions.principal_id
}

resource "azurerm_role_assignment" "github_actions_key_vault_secrets_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.github_actions.principal_id
}

resource "azurerm_role_assignment" "github_actions_resource_group_contributor" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.github_actions.principal_id
}

resource "azurerm_role_assignment" "github_actions_tfstate_blob_data_contributor" {
  scope                = azurerm_storage_account.main.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.github_actions.principal_id
}

resource "terraform_data" "build_backend_image" {
  count = var.build_backend_image && var.backend_container_image == null ? 1 : 0

  triggers_replace = {
    dockerfile_sha   = filesha256("${local.backend_source_dir}/Dockerfile")
    package_lock_sha = filesha256("${local.backend_source_dir}/package-lock.json")
    package_sha      = filesha256("${local.backend_source_dir}/package.json")
    src_sha = sha256(join("", [
      for file in fileset("${local.backend_source_dir}/src", "**") :
      filesha256("${local.backend_source_dir}/src/${file}")
    ]))
    image_name = var.backend_image_name
    image_tag  = var.backend_image_tag
  }

  provisioner "local-exec" {
    command = "az acr build --registry ${azurerm_container_registry.main.name} --image ${var.backend_image_name}:${var.backend_image_tag} ${local.backend_source_dir}"
  }

  depends_on = [
    azurerm_container_registry.main
  ]
}

resource "azurerm_storage_account" "main" {
  name                            = local.storage_account_name
  resource_group_name             = azurerm_resource_group.main.name
  location                        = azurerm_resource_group.main.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  allow_nested_items_to_be_public = false
  min_tls_version                 = "TLS1_2"
  tags                            = local.common_tags
}

resource "azurerm_storage_share" "uploads" {
  name               = local.uploads_share_name
  storage_account_id = azurerm_storage_account.main.id
  quota              = 20
}

resource "azurerm_container_app_environment" "main" {
  name                       = local.container_env_name
  location                   = local.container_apps_location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  tags                       = local.common_tags
}

resource "azurerm_container_app_environment_storage" "uploads" {
  name                         = "uploads"
  container_app_environment_id = azurerm_container_app_environment.main.id
  account_name                 = azurerm_storage_account.main.name
  share_name                   = azurerm_storage_share.uploads.name
  access_key                   = azurerm_storage_account.main.primary_access_key
  access_mode                  = "ReadWrite"
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                              = local.postgres_server_name
  resource_group_name               = azurerm_resource_group.main.name
  location                          = local.postgres_location
  version                           = var.postgres_version
  administrator_login               = var.postgres_admin_login
  administrator_password_wo         = var.postgres_admin_password
  administrator_password_wo_version = var.postgres_admin_password_version
  sku_name                          = var.postgres_sku_name
  storage_mb                        = var.postgres_storage_mb
  zone                              = var.postgres_zone
  backup_retention_days             = 7
  geo_redundant_backup_enabled      = false
  public_network_access_enabled     = true
  tags                              = local.common_tags
}

resource "azurerm_postgresql_flexible_server_database" "app" {
  name      = var.postgres_database_name
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "azure_services" {
  count            = var.allow_azure_services_to_postgres ? 1 : 0
  name             = "allow-azure-services"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "all_public_networks" {
  count            = var.allow_public_networks_to_postgres ? 1 : 0
  name             = "allow-all-public-networks"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "255.255.255.255"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allowed_ranges" {
  for_each         = var.postgres_allowed_ip_ranges
  name             = "allow-${each.key}"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = each.value.start
  end_ip_address   = each.value.end
}

resource "azurerm_container_app" "api" {
  name                         = local.container_app_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"
  tags                         = local.common_tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.container_apps.id]
  }

  registry {
    server   = azurerm_container_registry.main.login_server
    identity = azurerm_user_assigned_identity.container_apps.id
  }

  secret {
    name                = "database-password"
    key_vault_secret_id = "${azurerm_key_vault.main.vault_uri}secrets/${var.postgres_admin_password_secret_name}"
    identity            = azurerm_user_assigned_identity.container_apps.id
  }

  secret {
    name                = "jwt-secret"
    key_vault_secret_id = "${azurerm_key_vault.main.vault_uri}secrets/${var.jwt_secret_name}"
    identity            = azurerm_user_assigned_identity.container_apps.id
  }

  ingress {
    external_enabled = true
    target_port      = var.container_target_port

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = var.container_min_replicas
    max_replicas = var.container_max_replicas

    volume {
      name         = "uploads"
      storage_name = azurerm_container_app_environment_storage.uploads.name
      storage_type = "AzureFile"
    }

    container {
      name   = "almacen-api"
      image  = local.backend_image
      cpu    = var.container_cpu
      memory = var.container_memory

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "PORT"
        value = tostring(var.container_target_port)
      }

      env {
        name  = "DATABASE_HOST"
        value = azurerm_postgresql_flexible_server.main.fqdn
      }

      env {
        name  = "DATABASE_PORT"
        value = "5432"
      }

      env {
        name  = "DATABASE_SSL"
        value = "true"
      }

      env {
        name  = "DATABASE_SSL_REJECT_UNAUTHORIZED"
        value = "false"
      }

      env {
        name  = "DATABASE_USER"
        value = var.postgres_admin_login
      }

      env {
        name        = "DATABASE_PASSWORD"
        secret_name = "database-password"
      }

      env {
        name  = "DATABASE_NAME"
        value = var.postgres_database_name
      }

      env {
        name  = "DATABASE_SYNCHRONIZE"
        value = "false"
      }

      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-secret"
      }

      env {
        name  = "JWT_EXPIRES_IN"
        value = "1d"
      }

      env {
        name  = "REDIS_HOST"
        value = var.redis_host
      }

      env {
        name  = "REDIS_PORT"
        value = tostring(var.redis_port)
      }

      startup_probe {
        transport               = "HTTP"
        port                    = var.container_target_port
        path                    = var.health_probe_path
        initial_delay           = 5
        interval_seconds        = 10
        timeout                 = 5
        failure_count_threshold = 18
      }

      readiness_probe {
        transport               = "HTTP"
        port                    = var.container_target_port
        path                    = var.health_probe_path
        initial_delay           = 5
        interval_seconds        = 10
        timeout                 = 5
        failure_count_threshold = 3
        success_count_threshold = 1
      }

      liveness_probe {
        transport               = "HTTP"
        port                    = var.container_target_port
        path                    = var.health_probe_path
        initial_delay           = 30
        interval_seconds        = 30
        timeout                 = 5
        failure_count_threshold = 3
      }

      volume_mounts {
        name = "uploads"
        path = "/uploads"
      }
    }
  }

  depends_on = [
    azurerm_role_assignment.container_apps_acr_pull,
    azurerm_role_assignment.container_apps_key_vault_secrets_user,
    azurerm_postgresql_flexible_server_database.app,
    terraform_data.build_backend_image
  ]
}
