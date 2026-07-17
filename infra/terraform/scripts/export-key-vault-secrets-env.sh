#!/usr/bin/env bash
set -euo pipefail

expected_tenant_id="19767c7d-34c4-415c-9a1d-45ccfb89a3dd"
expected_subscription_id="5e3f35c0-0fe2-40db-a778-723c73670c4c"
postgres_secret_name="${POSTGRES_ADMIN_PASSWORD_SECRET_NAME:-postgres-admin-password}"
jwt_secret_name="${JWT_SECRET_NAME:-jwt-secret}"
github_token_secret_name="${GITHUB_TOKEN_SECRET_NAME:-github-token}"

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

shell_quote() {
  local value="$1"
  value="${value//\'/\'\\\'\'}"
  printf "'%s'" "$value"
}

key_vault_name="$(terraform output -raw key_vault_name)"
postgres_password="$(az keyvault secret show --vault-name "$key_vault_name" --name "$postgres_secret_name" --query value --output tsv)"
jwt_secret="$(az keyvault secret show --vault-name "$key_vault_name" --name "$jwt_secret_name" --query value --output tsv)"
github_token="$(az keyvault secret show --vault-name "$key_vault_name" --name "$github_token_secret_name" --query value --output tsv)"

cat <<EOF
export TF_VAR_postgres_admin_password=$(shell_quote "$postgres_password")
export NUEVA_ERA_JWT_SECRET=$(shell_quote "$jwt_secret")
export NUEVA_ERA_GITHUB_TOKEN=$(shell_quote "$github_token")
EOF
