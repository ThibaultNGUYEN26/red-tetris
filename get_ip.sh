HOSTNAME_FQDN=${HOSTNAME:-$(hostname)}
HOSTNAME_SHORT=$(echo "$HOSTNAME_FQDN" | sed -E 's/\..*//')

touch .env

if grep -q "^FRONTEND_URL=" .env; then
    sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=https://$HOSTNAME_SHORT:8443|" .env
else
    echo "FRONTEND_URL=https://$HOSTNAME_SHORT:8443" >> .env
fi
