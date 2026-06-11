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
| 443 | 0.0.0.0/0 | HTTPS (when you add Caddy) |

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

Default login (when `SEED_ON_START=true`):

- `admin@mailflow.com` / `admin123`

Then set `SEED_ON_START=false` in `.env` and run `docker compose up -d`.

## 6. Optional — HTTPS with Caddy

1. In `.env`, set `APP_PORT=8080` and `FRONTEND_URL=https://sendingmail.chetanchauhan.fun`
2. Restart: `docker compose up -d`
3. Install Caddy and use `deploy/Caddyfile` (see comments in that file)
4. Caddy obtains a Let's Encrypt certificate automatically

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

| Issue | Fix |
|-------|-----|
| Site not loading | Check DNS, security group port 80, `docker compose ps` |
| Login fails / CORS | `FRONTEND_URL` must match browser URL (http vs https) |
| API 502 | `docker compose logs backend` — wait for postgres/redis healthy |
| Campaign progress stuck | Backend must stay running; check worker logs |
