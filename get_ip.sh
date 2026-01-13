IP_ADDRESS=$(hostname | sed -E 's/\..*//')

touch .env

# Update or add IP_ADDRESS in .env
if grep -q "^DB_HOST=" .env; then
    sed -i "s/^DB_HOST=.*/DB_HOST=$IP_ADDRESS/" .env
else
    echo "DB_HOST=$IP_ADDRESS" >> .env
fi
