#!/usr/bin/env bash
set -euo pipefail

: "${TF_VAR_postgres_admin_password:?Set TF_VAR_postgres_admin_password first.}"
: "${NUEVA_ERA_JWT_SECRET:?Set NUEVA_ERA_JWT_SECRET first.}"

expected_tenant_id="19767c7d-34c4-415c-9a1d-45ccfb89a3dd"
expected_subscription_id="5e3f35c0-0fe2-40db-a778-723c73670c4c"
postgres_secret_name="${POSTGRES_ADMIN_PASSWORD_SECRET_NAME:-postgres-admin-password}"
jwt_secret_name="${JWT_SECRET_NAME:-jwt-secret}"

current_tenant_id="$(az account show --query tenantId --output tsv)"
current_subscription_id="$(az account show --query id --output tsv)"

if [[ "$current_tenant_id" != "$expected_tenant_id" || "$current_subscription_id" != "$expected_subscription_id" ]]; then
  echo "Azure CLI is not using the expected Nueva Era tenant/subscription." >&2
  echo "Expected tenant:       $expected_tenant_id" >&2
  echo "Current tenant:        $current_tenant_id" >&2
  echo "Expected subscription: $expected_subscription_id" >&2
  echo "Current subscription:  $current_subscription_id" >&2
  exit 1
fi

key_vault_name="$(terraform output -raw key_vault_name)"

set_secret() {
  local name="$1"
  local value="$2"

  for attempt in 1 2 3 4 5; do
    if az keyvault secret set \
      --vault-name "$key_vault_name" \
      --name "$name" \
      --value "$value" \
      --output none; then
      return 0
    fi

    echo "Waiting for Key Vault RBAC propagation before setting '$name' (attempt $attempt/5)..." >&2
    sleep 20
  done

  echo "Could not store '$name' in Key Vault after RBAC propagation retries." >&2
  return 1
}

set_secret "$postgres_secret_name" "$TF_VAR_postgres_admin_password"
set_secret "$jwt_secret_name" "$NUEVA_ERA_JWT_SECRET"

echo "Secrets were stored in Key Vault: $key_vault_name"
