# Nueva Era Azure Infrastructure

Terraform stack for the backend-only Azure deployment:

- Azure Container Apps for `Almacen-api`
- Azure Database for PostgreSQL Flexible Server
- Azure Container Registry Basic
- Azure Files mounted at `/uploads`
- Log Analytics for Container Apps logs
- PostgreSQL public firewall access from all public IPs, with database authentication still required
- Azure Key Vault for `DATABASE_PASSWORD` and `JWT_SECRET`
- Resource Group/Key Vault stay in `eastus`; PostgreSQL and Container Apps use `eastus2` because this subscription is restricted/saturated for those services in `eastus`.
- Terraform state is stored remotely in Azure Storage: `rg-nueva-era-prod` / `stnuevaeraprod2xg97h` / `tfstate` / `almacen-api-prod.tfstate`.

## Required Azure Context

Run Terraform from the workspace root environment so Azure CLI uses the project tenant:

```sh
cd /Users/carlos/Documents/nueva_era
source .envrc
cd Almacen-api/infra/terraform
```

Validate context:

```sh
az account show --query '{tenantId:tenantId, subscriptionId:id, subscriptionName:name, user:user.name}' --output table
```

Expected tenant: `19767c7d-34c4-415c-9a1d-45ccfb89a3dd`.

## Plan

```sh
terraform init
terraform fmt -recursive
terraform validate
terraform plan
```

## Clean Secret Flow

Secrets are not generated with Terraform resources and should not be committed to disk.

Generate ephemeral shell variables:

```sh
eval "$(./scripts/generate-secrets-env.sh)"
```

Create the Key Vault and RBAC first:

```sh
terraform apply \
  -target=azurerm_resource_group.main \
  -target=azurerm_user_assigned_identity.container_apps \
  -target=azurerm_key_vault.main \
  -target=azurerm_role_assignment.current_user_key_vault_secrets_officer \
  -target=azurerm_role_assignment.container_apps_key_vault_secrets_user
```

Store the generated secrets in Key Vault:

```sh
./scripts/set-key-vault-secrets.sh
```

On a later shell, recover the secrets through Azure before planning/applying:

```sh
eval "$(./scripts/export-key-vault-secrets-env.sh)"
```

Then run the full plan/apply:

```sh
terraform plan -out=tfplan
terraform apply "tfplan"
```

If Azure says a resource provider is not registered, register the missing namespace from the same Azure CLI context. At minimum this stack needs `Microsoft.App` for Container Apps:

```sh
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
```

## Notes

- This stack starts with PostgreSQL `B_Standard_B1ms` for the lowest monthly cost.
- The backend image defaults to the ACR image path created by this stack: `almacen-api:latest`.
- GitHub Actions should build and push the backend image to ACR. Terraform only creates the registry and points Container Apps at `almacen-api:latest`.
- `build_backend_image` exists as a local fallback, but should stay `false` for normal CI/CD-driven deployments.
- Redis is not provisioned yet. The backend currently falls back when Redis is unavailable, so managed Redis can be added later if cart/session persistence requires it.
- The current backend writes uploads to local paths; Azure Files is mounted at `/uploads` to support that behavior without code changes.
- PostgreSQL uses `administrator_password_wo` with an ephemeral Terraform variable, so the admin password is not stored as a readable Terraform state or plan attribute. Keep `TF_VAR_postgres_admin_password` in your shell while planning/applying.
