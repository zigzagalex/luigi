#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load repo .env if present (Compose / local defaults).
ENV_FILE="$(cd "${API_DIR}/.." && pwd)/.env"
if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

# Host-side seed talks to published Postgres, not the Docker service hostname.
if [[ -z "${DATABASE_URL:-}" ]]; then
  POSTGRES_USER="${POSTGRES_USER:-luigi}"
  POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-luigi}"
  POSTGRES_DB="${POSTGRES_DB:-luigi}"
  POSTGRES_PORT="${POSTGRES_PORT:-5432}"
  DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT}/${POSTGRES_DB}?sslmode=disable"
fi

export DATABASE_URL
export SEED_ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-admin@localhost}"
export SEED_ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-Admin123!}"

echo "==> Seeding local admin against ${DATABASE_URL%%\?*}"
echo "    email=${SEED_ADMIN_EMAIL}"

cd "${API_DIR}"
go run ./cmd/seedadmin
