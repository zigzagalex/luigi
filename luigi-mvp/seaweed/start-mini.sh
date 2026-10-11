#!/bin/sh
# Writes an S3 identity file, then starts weed mini.
# Anonymous callers may GET objects in $S3_BUCKET. The API key from
# AWS_ACCESS_KEY_ID stays an admin, so upload and delete still require it.
set -eu

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

access=$(json_escape "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}")
secret=$(json_escape "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}")
bucket=$(json_escape "${S3_BUCKET:?S3_BUCKET is required}")

cat > /tmp/s3.json << EOF
{
  "identities": [
    {
      "name": "anonymous",
      "actions": ["Read:${bucket}"]
    },
    {
      "name": "luigi-api",
      "credentials": [
        {"accessKey": "${access}", "secretKey": "${secret}"}
      ],
      "actions": ["Admin", "Read", "List", "Tagging", "Write"]
    }
  ]
}
EOF
chmod 644 /tmp/s3.json

exec /entrypoint.sh mini -dir=/data -s3.config=/tmp/s3.json
