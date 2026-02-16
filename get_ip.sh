HOSTNAME_FQDN=${HOSTNAME:-$(hostname)}
HOSTNAME_SHORT=$(echo "$HOSTNAME_FQDN" | sed -E 's/\..*//')

touch .env

# Update or add IP_ADDRESS in .env
if grep -q "^DB_HOST=" .env; then
    sed -i "s/^DB_HOST=.*/DB_HOST=$HOSTNAME_SHORT/" .env
else
    echo "DB_HOST=$HOSTNAME_SHORT" >> .env
fi

# Update or add VITE_API_URL in .env for frontend/backends run via Makefile
if grep -q "^VITE_API_URL=" .env; then
    sed -i "s|^VITE_API_URL=.*|VITE_API_URL=http://$HOSTNAME_SHORT:3000|" .env
else
    echo "VITE_API_URL=http://$HOSTNAME_SHORT:3000" >> .env
fi

# Update Vite dev server host to the short hostname
VITE_CONFIG="frontend/vite.config.js"
if [ -f "$VITE_CONFIG" ]; then
    if grep -q "host:" "$VITE_CONFIG"; then
        sed -i "s/host: .*/host: '$HOSTNAME_SHORT',/" "$VITE_CONFIG"
    else
        sed -i "s/server: {/server: {\\n    host: '$HOSTNAME_SHORT',/" "$VITE_CONFIG"
    fi
fi
