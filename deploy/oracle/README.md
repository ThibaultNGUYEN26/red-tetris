# Oracle Backend Deployment

This deploys only the backend API for:

```txt
https://api.thibault-nguyen.dev
```

The frontend stays on Vercel with:

```env
VITE_BACKEND_URL=https://api.thibault-nguyen.dev
```

## Server Setup

Use an Oracle Always Free Ubuntu VM. Open inbound ports in both Oracle security lists and the VM firewall:

```txt
22/tcp
80/tcp
443/tcp
```

Install Docker on the VM:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc > /dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out and back in so the Docker group applies.

## Environment

Create `.env.production` at the repo root on the VM. Do not commit it.

```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://tetris.thibault-nguyen.dev
SESSION_SECRET=replace-with-a-new-long-random-secret

DB_USER=red_tetris
DB_PASSWORD=replace-with-a-new-long-random-password
DB_NAME=red_tetris

SMTP_NAME=red-tetris
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=replace-me
SMTP_PASS=replace-me
SMTP_FROM=replace-me
CONTACT_EMAIL=replace-me
```

## DNS

Create this DNS record where you manage `thibault-nguyen.dev`:

```txt
Type: A
Name: api
Value: <oracle-vm-public-ip>
Proxy: DNS only, if using Cloudflare
```

Caddy will issue and renew the HTTPS certificate automatically after DNS points to the VM.

## Deploy

From the repo root on the VM:

```bash
docker compose -f docker-compose.oracle.yml --env-file .env.production up -d --build
docker compose -f docker-compose.oracle.yml --env-file .env.production logs -f caddy backend
```

To validate the compose file locally with another env file:

```bash
ENV_FILE=.env docker compose -f docker-compose.oracle.yml --env-file .env config
```

Check health:

```bash
curl https://api.thibault-nguyen.dev/health
```

Expected:

```json
{"status":"ok"}
```

## Update

```bash
git pull
docker compose -f docker-compose.oracle.yml --env-file .env.production up -d --build
```

## Backup Database

```bash
docker compose -f docker-compose.oracle.yml --env-file .env.production exec -T postgres \
  pg_dump -U "$DB_USER" "$DB_NAME" > backup.sql
```
