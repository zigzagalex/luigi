#!/bin/sh
# Installed at /opt/luigi/deploy.sh. OpenSSH ForceCommand points here.
# A human rollback is: /opt/luigi/deploy.sh <40-character sha>
# GitHub Actions sends that same sha as the remote command.
#
# Optional git checkout: clone this repo to /opt/luigi/src. A private repo
# needs a read token in /opt/luigi/github_token (mode 600). The script then
# checks out the sha before rolling images, so Caddyfile and Compose updates
# land with the deploy. Without that clone, only image tags change.
set -eu

ENV_FILE=/opt/luigi/.env
SRC=/opt/luigi/src
COSIGN_IMAGE=ghcr.io/sigstore/cosign/cosign:v2.6.5

sha="${SSH_ORIGINAL_COMMAND:-}"
if [ -n "${1:-}" ]; then
  sha=$1
fi
# ForceCommand puts the whole client command in SSH_ORIGINAL_COMMAND.
# Reject anything that is not one git sha.
case "$sha" in
  *[!0-9a-f]*|"")
    echo "refusing: expected one 40-character git sha" >&2
    exit 1
    ;;
esac
if [ "${#sha}" -ne 40 ]; then
  echo "refusing: expected one 40-character git sha" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "missing $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if [ -z "${GHCR_OWNER:-}" ] || [ -z "${GITHUB_REPOSITORY:-}" ]; then
  echo "GHCR_OWNER and GITHUB_REPOSITORY must be set in $ENV_FILE" >&2
  exit 1
fi

if [ -d "$SRC/.git" ]; then
  if [ -f /opt/luigi/github_token ]; then
    ask=$(mktemp)
    cat > "$ask" << 'EOF'
#!/bin/sh
case "$1" in
  *Username*) printf '%s\n' x-access-token ;;
  *) cat /opt/luigi/github_token ;;
esac
EOF
    chmod 700 "$ask"
    GIT_ASKPASS=$ask GIT_TERMINAL_PROMPT=0 git -C "$SRC" fetch --depth 1 origin "$sha"
    rm -f "$ask"
  else
    git -C "$SRC" fetch --depth 1 origin "$sha"
  fi
  git -C "$SRC" checkout --detach "$sha"
  install -m 755 "$SRC/luigi-mvp/deploy/deploy.sh" /opt/luigi/deploy.sh
  compose_dir=$SRC/luigi-mvp
else
  compose_dir=/opt/luigi
fi

identity="https://github.com/${GITHUB_REPOSITORY}/.github/workflows/cd.yml@refs/heads/main"
found=0

verify() {
  name=$1
  image="ghcr.io/${GITHUB_REPOSITORY}/luigi-${name}:${sha}"
  if ! docker manifest inspect "$image" >/dev/null 2>&1; then
    return 0
  fi
  docker run --rm \
    --user "$(id -u):$(id -g)" \
    -e HOME=/tmp \
    -e DOCKER_CONFIG=/docker \
    -v "${HOME}/.docker:/docker:ro" \
    "$COSIGN_IMAGE" \
    verify \
    --certificate-identity "$identity" \
    --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
    "$image"
  found=1
  case "$name" in
    api) key=API_TAG ;;
    web-shop) key=SHOP_TAG ;;
    web-admin) key=ADMIN_TAG ;;
  esac
  tmp=$(mktemp)
  grep -v "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$sha" >> "$tmp"
  chmod 600 "$tmp"
  mv "$tmp" "$ENV_FILE"
}

verify api
verify web-shop
verify web-admin

if [ "$found" -eq 0 ]; then
  if [ -z "${API_TAG:-}" ] || [ -z "${SHOP_TAG:-}" ] || [ -z "${ADMIN_TAG:-}" ]; then
    echo "no images for $sha and API_TAG, SHOP_TAG, or ADMIN_TAG is empty" >&2
    exit 1
  fi
  echo "no new images for $sha; updating the stack with the tags already in $ENV_FILE"
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

cd "$compose_dir"
docker compose --env-file "$ENV_FILE" pull
docker compose --env-file "$ENV_FILE" up -d

i=0
while [ "$i" -lt 30 ]; do
  status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' luigi-api 2>/dev/null || true)
  if [ "$status" = "healthy" ]; then
    docker compose --env-file "$ENV_FILE" ps
    exit 0
  fi
  i=$((i + 1))
  sleep 2
done

echo "api did not become healthy" >&2
docker compose --env-file "$ENV_FILE" ps
exit 1
