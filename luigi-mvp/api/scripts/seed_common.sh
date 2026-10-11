# Shared helpers for HTTP seed scripts. Source from each script:
#   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   # shellcheck source=seed_common.sh
#   source "${SCRIPT_DIR}/seed_common.sh"

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
SEED_ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-admin@localhost}"
SEED_ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-Admin123!}"
COOKIE_JAR="${COOKIE_JAR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.seed_cookies.txt}"

seed_require_cmds() {
  local cmd
  for cmd in "$@"; do
    if ! command -v "${cmd}" >/dev/null 2>&1; then
      echo "Error: required command '${cmd}' not found." >&2
      exit 1
    fi
  done
}

seed_wait_api() {
  local i
  echo "-> Waiting for API at ${API_BASE_URL}/health ..."
  for i in $(seq 1 60); do
    if curl -sSf "${API_BASE_URL}/health" >/dev/null 2>&1; then
      echo "   API is up"
      return 0
    fi
    sleep 1
  done
  echo "Error: API health check failed at ${API_BASE_URL}/health" >&2
  exit 1
}

seed_login() {
  seed_require_cmds curl jq
  rm -f "${COOKIE_JAR}"

  echo "-> Logging in as ${SEED_ADMIN_EMAIL} ..."
  local code
  code="$(
    curl -sS -o /tmp/luigi_seed_login.json -w "%{http_code}" \
      -c "${COOKIE_JAR}" \
      -X POST "${API_BASE_URL}/v1/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"${SEED_ADMIN_EMAIL}\",\"password\":\"${SEED_ADMIN_PASSWORD}\"}"
  )"
  if [[ "${code}" != "200" ]]; then
    echo "Error: admin login failed (${code}): $(cat /tmp/luigi_seed_login.json 2>/dev/null || true)" >&2
    exit 1
  fi

  code="$(
    curl -sS -o /tmp/luigi_seed_me.json -w "%{http_code}" \
      -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" \
      "${API_BASE_URL}/v1/auth/me"
  )"
  if [[ "${code}" != "200" ]]; then
    echo "Error: /auth/me failed after login (${code})" >&2
    exit 1
  fi

  local role
  role="$(jq -r '.role // empty' /tmp/luigi_seed_me.json)"
  if [[ "${role}" != "admin" && "${role}" != "staff" ]]; then
    echo "Error: seeded user role is '${role}', need admin or staff" >&2
    exit 1
  fi
  echo "   Logged in (role=${role}), cookies -> ${COOKIE_JAR}"
}

# Authenticated curl for write/seed calls. Public GETs may use plain curl.
api_curl() {
  if [[ ! -f "${COOKIE_JAR}" ]]; then
    echo "Error: missing cookie jar ${COOKIE_JAR}. Run seed_login (via dev_seed_all.sh) first." >&2
    exit 1
  fi
  curl -sS -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" "$@"
}
