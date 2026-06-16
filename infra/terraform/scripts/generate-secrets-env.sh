#!/usr/bin/env bash
set -euo pipefail

postgres_password="$(openssl rand -base64 36 | tr -d '\n')"
jwt_secret="$(openssl rand -hex 48)"

cat <<EOF
export TF_VAR_postgres_admin_password='${postgres_password}'
export NUEVA_ERA_JWT_SECRET='${jwt_secret}'
EOF
