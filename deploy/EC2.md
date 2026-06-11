# Deploy MailFlow on EC2 (sendingmail.chetanchauhan.fun)

Monorepo layout on one EC2 instance — **frontend and backend run as separate Docker services**, but users see a **single domain**:

| URL | Served by |
|-----|-----------|
| `http://sendingmail.chetanchauhan.fun/` | Frontend (React SPA) |
| `http://sendingmail.chetanchauhan.fun/api/*` | Backend (proxied by frontend nginx) |
| `http://sendingmail.chetanchauhan.fun/ws` | Backend WebSocket (proxied) |

Postgres and Redis stay internal — not exposed to the internet.

## 1. DNS

In your DNS provider (where `chetanchauhan.fun` is managed):

| Type | Name | Value |
|------|------|-------|
| A | `sendingmail` | Your EC2 **Elastic IP** |

Wait a few minutes, then check:

```bash
dig +short sendingmail.chetanchauhan.fun
```

## 2. EC2 instance

- **AMI:** Ubuntu 22.04 LTS
- **Type:** `t3.small` (recommended) or `t3.micro` for light testing
- **Storage:** 20 GB+
- **Elastic IP:** attach one so the IP does not change on restart

### Security group

| Port | Source | Purpose |
|------|--------|---------|
| 22 | Your IP | SSH |
| 80 | 0.0.0.0/0 | HTTP |
| 443 | 0.0.0.0/0 | HTTPS (Certbot) |

Do **not** open 3001, 5432, or 6379.

## 3. Install Docker on EC2

```bash
ssh -i your-key.pem ubuntu@<EC2_IP>

curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
newgrp docker
```

## 4. Clone and configure

```bash
git clone <your-repo-url> MailSender
cd MailSender

cp deploy/.env.production.example .env
nano .env   # set JWT_SECRET, email keys
```

Required in `.env`:

```env
FRONTEND_URL=http://sendingmail.chetanchauhan.fun
APP_PORT=80
JWT_SECRET=<openssl rand -hex 32>
```

`FRONTEND_URL` must match the browser URL exactly (CORS).

## 5. Start the stack

```bash
docker compose up -d --build
```

Check:

```bash
docker compose ps
curl -s http://localhost/api/health
```

Open **http://sendingmail.chetanchauhan.fun** in your browser.

Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env`, then set `SEED_ON_START=false` after first login and run `docker compose up -d`.

## 6. HTTPS with Certbot (nginx already on port 80)

Prerequisites: HTTP works at `http://sendingmail.chetanchauhan.fun`, port **443** open in the security group, DNS points to this server.

### 6a. WebSocket map (one-time, if not already present)

Certbot + campaign live progress need this in `/etc/nginx/nginx.conf` inside the `http { }` block:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

```bash
sudo nano /etc/nginx/nginx.conf   # add the map above inside http { }
sudo nginx -t
```

### 6b. Install Certbot

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### 6c. Obtain certificate

```bash
sudo certbot --nginx -d sendingmail.chetanchauhan.fun
```

Follow the prompts (email, agree to terms). Choose **redirect HTTP to HTTPS** when asked.

Certbot updates `/etc/nginx/sites-available/mailflow` with SSL and auto-renewal.

### 6d. Update app env for HTTPS

```bash
cd ~/repos/mailSender/Bulk-Mail-sender-inhouse   # your repo path
nano .env
```

```env
FRONTEND_URL=https://sendingmail.chetanchauhan.fun
APP_PORT=8080
```

```bash
sudo docker compose up -d
```

`FRONTEND_URL` must use `https://` or login/API will fail (CORS).

### 6e. Verify

```bash
curl -s https://sendingmail.chetanchauhan.fun/api/health
sudo certbot renew --dry-run
```

Open **https://sendingmail.chetanchauhan.fun** in the browser (padlock icon).

### Certbot troubleshooting

| Error | Fix |
|-------|-----|
| Connection refused on 443 | Open port 443 in EC2 security group |
| DNS problem | `dig +short sendingmail.chetanchauhan.fun` must show your EC2 IP |
| nginx test fails after certbot | `sudo nginx -t` — check for duplicate `server_name` |
| Login works on HTTP but not HTTPS | Set `FRONTEND_URL=https://...` and restart backend |

## 7. Updates

```bash
cd MailSender
git pull
docker compose up -d --build
```

## 8. Logs and troubleshooting

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### `curl localhost/api/health` returns nginx 404 (Ubuntu)

That means **host nginx** is on port 80, not the MailFlow container.

Check what is listening:

```bash
sudo ss -tlnp | grep ':80'
docker compose ps
curl -s http://127.0.0.1:8080/api/health   # if APP_PORT=8080
```

**Fix A — EC2 dedicated to MailFlow (simplest):** stop host nginx, use Docker on 80

```bash
sudo systemctl stop nginx
sudo systemctl disable nginx
# In .env: APP_PORT=80
docker compose up -d
curl -s http://localhost/api/health
```

**Fix B — keep host nginx (recommended if nginx was already installed):**

```bash
# In .env
APP_PORT=8080

docker compose up -d --build
curl -s http://127.0.0.1:8080/api/health   # should return {"status":"ok",...}

sudo cp deploy/nginx-host.conf /etc/nginx/sites-available/mailflow
sudo ln -sf /etc/nginx/sites-available/mailflow /etc/nginx/sites-enabled/mailflow
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

curl -s http://localhost/api/health
curl -s http://sendingmail.chetanchauhan.fun/api/health
```

| Issue | Fix |
|-------|-----|
| Site not loading | Check DNS, security group port 80, `docker compose ps` |
| `/api/health` 404 from Ubuntu nginx | Host nginx on :80 — use Fix A or B above |
| Login fails / CORS | `FRONTEND_URL` must match browser URL (http vs https) |
| API 502 | `docker compose logs backend` — wait for postgres/redis healthy |
| Campaign progress stuck | Backend must stay running; check worker logs |
