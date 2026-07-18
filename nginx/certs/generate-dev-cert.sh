#!/usr/bin/env sh
# Generate a self-signed cert + key for local HTTPS. Local dev only — production
# mounts real, operator-managed certs via TLS_CERT_PATH / TLS_KEY_PATH. The
# output (dev.crt / dev.key) is gitignored; never commit private keys.
set -eu

DIR="$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)"

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$DIR/dev.key" \
  -out "$DIR/dev.crt" \
  -days 365 \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Wrote $DIR/dev.crt and $DIR/dev.key (self-signed, CN=localhost, 365 days)."
