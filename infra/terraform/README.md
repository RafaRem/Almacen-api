# Nueva Era Azure Infrastructure

Terraform stack for the backend-only Azure deployment:

- Azure Container Apps for `Almacen-api`
- Azure Database for PostgreSQL Flexible Server
- Azure Container Registry Basic
- Azure Files mounted at `/uploads`
- Log Analytics for Container Apps logs
- PostgreSQL public firewall access from all public IPs, with database authentication still required
- Azure Key Vault for `DATABASE_PASSWORD`, `JWT_SECRET`, and `GITHUB_TOKEN`
- HTTP startup, readiness, and liveness probes against `/health`
- Resource Group/Key Vault stay in `eastus`; PostgreSQL and Container Apps use `eastus2` because this subscription is restricted/saturated for those services in `eastus`.
- Terraform state is stored remotely in Azure Storage: `rg-nueva-era-prod` / `stnuevaeraprod2xg97h` / `tfstate` / `almacen-api-prod.tfstate`.

## Required Azure Context

Run Terraform from the workspace root environment so Azure CLI uses the project tenant:

```sh
cd /Users/m1/Documents/nueva_era
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
read -rs -p "GitHub token: " NUEVA_ERA_GITHUB_TOKEN
echo
export NUEVA_ERA_GITHUB_TOKEN
```

Use a newly generated GitHub token here. Never paste it into source files,
shell history, Terraform variables, or chat messages.

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
- The release deployment workflow uses GitHub OIDC with the managed identity created by this stack. It builds the release image, runs SQL migrations, applies Terraform with the release tag, and verifies `/health`.
- Redis is not provisioned yet. The backend currently falls back when Redis is unavailable, so managed Redis can be added later if cart/session persistence requires it.
- The current backend writes uploads to local paths; Azure Files is mounted at `/uploads` to support that behavior without code changes.
- PostgreSQL uses `administrator_password_wo` with an ephemeral Terraform variable, so the admin password is not stored as a readable Terraform state or plan attribute. Keep `TF_VAR_postgres_admin_password` in your shell while planning/applying.

## GitHub Release Deployment

The workflow at `.github/workflows/deploy-prod.yml` runs on `release.published`
and can also be started manually with `workflow_dispatch`.

Terraform creates:

- A user-assigned managed identity for GitHub Actions.
- A federated credential limited to `repo:RafaRem/Almacen-api:environment:prod`.
- RBAC for ACR push, Key Vault secret read, Terraform state access, and Container App updates.

The workflow references the GitHub environment `prod`, uses non-secret Azure
IDs directly, and authenticates with OIDC, so no GitHub secrets are required.

Deployment order:

1. Build and smoke-test the NestJS backend.
2. Build and push the release image to ACR.
3. Run pending SQL files from `migrations/` with `scripts/run-sql-migrations.sh`.
4. Apply Terraform with `backend_image_tag` set to the release tag.
5. Verify the public `/health` endpoint.

Migration behavior:

- Applied SQL files are tracked in `schema_migrations` with a SHA-256 checksum.
- If production is empty, the workflow initializes the schema with TypeORM
  `schema:sync` and baselines the existing SQL files so future SQL files run
  normally.
- If a non-empty database has no `schema_migrations` table, the runner refuses
  to replay historical migrations unless `BASELINE_EXISTING_DATABASE=true` is
  explicitly set for a one-time baseline.
