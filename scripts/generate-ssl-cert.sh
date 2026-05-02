#!/usr/bin/env sh
set -eu

CERT_DIR="certs"
CERT_FILE="$CERT_DIR/red-tetris.crt"
KEY_FILE="$CERT_DIR/red-tetris.key"
HOSTNAME_FQDN=${HOSTNAME:-$(hostname)}
HOSTNAME_SHORT=$(echo "$HOSTNAME_FQDN" | sed -E 's/\..*//')

mkdir -p "$CERT_DIR"

if [ -s "$CERT_FILE" ] && [ -s "$KEY_FILE" ]; then
    echo "SSL certificate already exists in $CERT_DIR"
    exit 0
fi

if ! command -v openssl >/dev/null 2>&1; then
    echo "openssl is required to generate the HTTPS certificate" >&2
    exit 1
fi

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/CN=$HOSTNAME_SHORT" \
    -addext "subjectAltName=DNS:$HOSTNAME_SHORT,DNS:localhost,IP:127.0.0.1" \
    -addext "extendedKeyUsage=serverAuth"

echo "Generated self-signed SSL certificate in $CERT_DIR"
