#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8080/v1}"
FIREBASE_API_KEY="${FIREBASE_API_KEY:?Set FIREBASE_API_KEY env var first}"

# Make a throwaway user every run
EMAIL="test+$(date +%s)@example.com"
PASSWORD="TestPassw0rd!$(date +%s)"

COOKIE_JAR="./cookies.txt"

echo "== Using API_BASE: $API_BASE"
echo "== Creating Firebase user: $EMAIL"

# 1) Sign up (returns idToken if returnSecureToken=true)
SIGNUP_RES="$(curl -sS \
  -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}" \
  -H "Content-Type: application/json" \
  --data-binary "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"returnSecureToken\":true}"
)"

ID_TOKEN="$(echo "$SIGNUP_RES" | jq -r '.idToken // empty')"

if [[ -z "$ID_TOKEN" ]]; then
  echo "Signup didn't return idToken. Full response:"
  echo "$SIGNUP_RES" | jq .
  exit 1
fi

echo "== Got Firebase idToken (length: ${#ID_TOKEN})"

# 2) Exchange ID token -> session cookie in YOUR Go API
echo "== Exchanging idToken for session cookie at ${API_BASE}/auth/session"
rm -f "$COOKIE_JAR"

curl -sS -D /tmp/session_headers.txt \
  -c "$COOKIE_JAR" \
  -X POST "${API_BASE}/auth/session" \
  -H "Content-Type: application/json" \
  --data-binary "{\"idToken\":\"${ID_TOKEN}\"}" \
  | jq .

echo "== Response headers (look for Set-Cookie):"
grep -i "set-cookie" /tmp/session_headers.txt || true

echo "== Cookie jar contents:"
cat "$COOKIE_JAR" || true

# 3) Call /me using the cookie jar
echo "== Calling ${API_BASE}/auth/me with session cookie"
curl -sS \
  -b "$COOKIE_JAR" \
  "${API_BASE}/auth/me" \
  | jq .

# 4) Call a protected route (adjust to one you protected)
echo "== Calling a protected route (example: ${API_BASE}/users?limit=1)"
set +e
HTTP_CODE="$(curl -sS -o /tmp/protected_body.txt -w "%{http_code}" \
  -b "$COOKIE_JAR" \
  "${API_BASE}/users?limit=1"
)"
set -e

echo "== Protected route status: $HTTP_CODE"
echo "== Body:"
cat /tmp/protected_body.txt
echo

# 5) Logout and confirm cookie is cleared
echo "== Logging out"
curl -sS \
  -b "$COOKIE_JAR" \
  -c "$COOKIE_JAR" \
  -X POST "${API_BASE}/auth/logout" \
  | jq .

echo "== Cookie jar after logout:"
cat "$COOKIE_JAR" || true

echo "== /me after logout (should be 401)"
set +e
curl -sS -i \
  -b "$COOKIE_JAR" \
  "${API_BASE}/auth/me" | sed -n '1,12p'
set -e

echo "✅ Done."
