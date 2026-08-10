# MailFlow backend on EC2 (Docker + nginx) — step 0 to Postman

Backend-only stack: **Postgres + Redis + Express** in light Alpine containers.  
Host **nginx** proxies `/health`, `/api`, `/ws`. No frontend image (saves disk).

Replace placeholders:

| Placeholder | Example |
|-------------|---------|
| `YOUR_API_HOST` | `api.yourdomain.com` or EC2 public IP / DNS |
| `ADMIN_EMAIL` | `admin@yourcompany.com` |
| `ADMIN_PASSWORD` | a strong password |

> **Filename:** use `docker-compose.backend.yml` (all lowercase).  
> `docker-compose.Backend.yml` will fail on Linux.

---

## If `docker compose … --build` froze your EC2

That is almost always **out of RAM** during `npm ci` / image build (common on 1GB instances). The machine looks hung until reboot.

### Recover the instance

1. In AWS console: **Instance state → Reboot** (or Stop → Start if reboot fails).
2. SSH back in.
3. Stop any leftover compose work:

```bash
cd ~/MailSender
docker compose -f docker-compose.backend.yml down || true
sudo systemctl restart docker
free -h
df -h /
```

### Do not run this on a small EC2 again

```bash
# AVOID on 1GB RAM:
docker compose -f docker-compose.backend.yml up -d --build
```

Use **Option A** (recommended) or **Option B** below.

---

## Option A (recommended) — build image on your laptop, load on EC2

On your **laptop** (this repo):

```bash
cd /path/to/MailSender
chmod +x scripts/*.sh
./scripts/build-backend-image.sh
# creates mailflow-backend.tar.gz
```

Copy to EC2:

```bash
scp -i your-key.pem mailflow-backend.tar.gz ubuntu@YOUR_EC2_IP:~/
```

On **EC2** (after Docker install + project + `.env` — Steps 1–4):

```bash
gunzip -c ~/mailflow-backend.tar.gz | docker load
cd ~/MailSender
chmod +x scripts/ec2-safe-up.sh
./scripts/ec2-safe-up.sh
```

That script adds **2G swap**, starts Postgres/Redis, then starts the preloaded backend **without rebuilding**.

---

## Option B — build on EC2 only after swap

Still risky on 1GB; swap helps a lot.

```bash
cd ~/MailSender
chmod +x scripts/ec2-safe-up.sh
./scripts/ec2-safe-up.sh
```

---

## Step 0 — EC2 basics

1. Ubuntu 22.04/24.04 EC2 with security group open:
   - **22** (SSH)
   - **80** (HTTP)
   - **443** (HTTPS, after Certbot)
2. SSH in:

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

3. Check free disk (aim to keep several GB free):

```bash
df -h /
```

---

## Step 1 — Install Docker

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

sudo usermod -aG docker ubuntu
```

Log out and SSH back in so the `docker` group applies, then verify:

```bash
docker --version
docker compose version
```

---

## Step 2 — Install nginx (on the host, not in Docker)

```bash
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## Step 3 — Put the project on the server

**Option A — git clone** (if the repo is available):

```bash
cd ~
git clone YOUR_REPO_URL MailSender
cd MailSender
```

**Option B — scp/rsync from your laptop** (no push required for nginx; you can paste configs below):

```bash
# on your laptop
rsync -avz --exclude node_modules --exclude .git \
  -e "ssh -i your-key.pem" \
  ./MailSender/ ubuntu@YOUR_EC2_PUBLIC_IP:~/MailSender/
```

Then on the server:

```bash
cd ~/MailSender
```

---

## Step 4 — Create `.env`

```bash
cd ~/MailSender
cp .env.example .env
nano .env
```

Minimum values (edit to match yours):

```env
# CORS — for Postman-only testing this can stay localhost.
# Later set to your Cloudflare Pages URL (https://...).
FRONTEND_URL=http://localhost

JWT_SECRET=paste-a-long-random-string-here

ALLOW_PUBLIC_SIGNUP=false
SEED_ON_START=true
SEED_ADMIN_EMAIL=ADMIN_EMAIL
SEED_ADMIN_PASSWORD=ADMIN_PASSWORD
SEED_ADMIN_NAME=Admin

# Optional until you test real sending
SENDGRID_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

Generate a secret if needed:

```bash
openssl rand -hex 32
```

---

## Step 5 — Start the backend stack (safe)

Prefer Option A (laptop image) or Option B (safe script) from the top of this doc.

```bash
cd ~/MailSender
chmod +x scripts/ec2-safe-up.sh
./scripts/ec2-safe-up.sh
```

Wait for seed, then check:

```bash
docker compose -f docker-compose.backend.yml ps
docker compose -f docker-compose.backend.yml logs -f backend
```

Press `Ctrl+C` to stop following logs (containers keep running).

```bash
curl -s http://127.0.0.1:3001/health
```

Expected: `{"status":"ok","timestamp":"..."}`

Free disk:

```bash
docker image prune -f
df -h /
```

---

## Step 6 — nginx WebSocket map (copy-paste)

Create the map file (required for `/ws`):

```bash
sudo tee /etc/nginx/conf.d/websocket-map.conf > /dev/null <<'EOF'
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
EOF
```

Confirm `http {` in `/etc/nginx/nginx.conf` loads conf.d (Ubuntu default usually has):

```nginx
include /etc/nginx/conf.d/*.conf;
include /etc/nginx/sites-enabled/*;
```

---

## Step 7 — nginx API site (copy-paste)

Replace `YOUR_API_HOST` with your domain or EC2 public DNS/IP:

```bash
sudo tee /etc/nginx/sites-available/mailflow-api > /dev/null <<'EOF'
server {
    listen 80;
    server_name YOUR_API_HOST;

    client_max_body_size 15m;

    location /health {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
EOF
```

**Important:** if you used the heredoc above literally, edit the file and set `server_name`:

```bash
sudo nano /etc/nginx/sites-available/mailflow-api
# change YOUR_API_HOST to your real host or _
```

Using `_` matches any Host header (handy for testing by IP):

```nginx
server_name _;
```

Enable site and reload:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/mailflow-api /etc/nginx/sites-enabled/mailflow-api
sudo nginx -t
sudo systemctl reload nginx
```

Test through nginx (from the server):

```bash
curl -s http://127.0.0.1/health
```

From your laptop (replace host):

```bash
curl -s http://YOUR_API_HOST/health
```

---

## Step 8 — (Optional) HTTPS with Certbot

Only after DNS `YOUR_API_HOST` points to this EC2:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_API_HOST
```

Then use `https://YOUR_API_HOST` in Postman.

---

## Step 9 — Postman: exercise the APIs

Base URL examples:

- `http://YOUR_API_HOST`
- or `https://YOUR_API_HOST` after Certbot

### 9.1 Health (no auth)

| | |
|--|--|
| Method | `GET` |
| URL | `{{baseUrl}}/health` |

Also works: `{{baseUrl}}/api/health`

---

### 9.2 Login

| | |
|--|--|
| Method | `POST` |
| URL | `{{baseUrl}}/api/auth/login` |
| Headers | `Content-Type: application/json` |
| Body (raw JSON) | see below |

```json
{
  "email": "ADMIN_EMAIL",
  "password": "ADMIN_PASSWORD"
}
```

Copy `token` from the response. In Postman, create a collection variable `token` or use the Authorization tab: **Bearer Token**.

---

### 9.3 Profile

| | |
|--|--|
| Method | `GET` |
| URL | `{{baseUrl}}/api/auth/profile` |
| Auth | Bearer `{{token}}` |

---

### 9.4 Dashboard stats

| | |
|--|--|
| Method | `GET` |
| URL | `{{baseUrl}}/api/dashboard/stats` |
| Auth | Bearer `{{token}}` |

---

### 9.5 List campaigns

| | |
|--|--|
| Method | `GET` |
| URL | `{{baseUrl}}/api/campaigns` |
| Auth | Bearer `{{token}}` |

---

### 9.6 Create campaign

| | |
|--|--|
| Method | `POST` |
| URL | `{{baseUrl}}/api/campaigns` |
| Auth | Bearer `{{token}}` |
| Headers | `Content-Type: application/json` |

```json
{
  "name": "Test campaign",
  "subject": "Hello {{name}}",
  "body": "<p>Hi {{name}}, this is a test.</p>",
  "provider": "smtp",
  "senderEmail": "you@example.com",
  "senderName": "MailFlow",
  "smtpConfig": {
    "host": "smtp.example.com",
    "port": 587,
    "user": "smtp-user",
    "pass": "smtp-pass"
  }
}
```

For SendGrid instead of SMTP, use:

```json
{
  "name": "Test campaign",
  "subject": "Hello {{name}}",
  "body": "<p>Hi {{name}}</p>",
  "provider": "sendgrid",
  "senderEmail": "you@example.com",
  "senderName": "MailFlow",
  "sendgridApiKey": "SG.xxxxx"
}
```

Save the returned campaign `id`.

---

### 9.7 Upload recipients (CSV)

| | |
|--|--|
| Method | `POST` |
| URL | `{{baseUrl}}/api/campaigns/{{campaignId}}/upload` |
| Auth | Bearer `{{token}}` |
| Body | form-data → key `file` (type File) → your `.csv` |

Minimal CSV:

```csv
email,name
alice@example.com,Alice
bob@example.com,Bob
```

---

### 9.8 Start campaign

| | |
|--|--|
| Method | `POST` |
| URL | `{{baseUrl}}/api/campaigns/{{campaignId}}/start` |
| Auth | Bearer `{{token}}` |

---

### 9.9 Progress / details

| Method | URL |
|--------|-----|
| `GET` | `{{baseUrl}}/api/campaigns/{{campaignId}}/progress` |
| `GET` | `{{baseUrl}}/api/campaigns/{{campaignId}}` |

---

### 9.10 Other useful endpoints

| Method | URL | Notes |
|--------|-----|--------|
| `POST` | `/api/campaigns/{{id}}/duplicate` | Copy campaign |
| `POST` | `/api/campaigns/{{id}}/retry-failed` | Re-queue failures |
| `POST` | `/api/campaigns/{{id}}/recipients/{{recipientId}}/retry` | Single retry |
| `GET` | `/api/campaigns/{{id}}/export-failed` | Failed emails export |
| `POST` | `/api/campaigns/parse-csv` | Preview parse (form-data `file`) |
| `POST` | `/api/auth/register` | **403** unless `ALLOW_PUBLIC_SIGNUP=true` |

WebSocket (not Postman REST): `ws://YOUR_API_HOST/ws` or `wss://...` after HTTPS.

---

## Day-2 commands

```bash
cd ~/MailSender

# Status
docker compose -f docker-compose.backend.yml ps

# Logs
docker compose -f docker-compose.backend.yml logs -f backend

# Restart after .env change
docker compose -f docker-compose.backend.yml up -d --force-recreate backend

# Stop (keeps DB data)
docker compose -f docker-compose.backend.yml down

# Stop and WIPE database volumes
docker compose -f docker-compose.backend.yml down -v

# Rebuild after code pull
docker compose -f docker-compose.backend.yml up -d --build
docker image prune -f
```

After first successful seed, you can set in `.env`:

```env
SEED_ON_START=false
```

then recreate the backend container so passwords are not reset on every restart.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| `curl /health` fails on :80 | `sudo nginx -t`, `sudo systemctl status nginx`, `docker compose ... ps` |
| 502 Bad Gateway | Backend down: `docker compose -f docker-compose.backend.yml logs backend` |
| Login 401 | Wrong `SEED_ADMIN_*` or seed did not run — check backend logs for seed |
| Upload 413 | `client_max_body_size 15m` missing in nginx |
| Disk full | `docker system df`, `docker image prune -f`, `docker builder prune -f` |
| WS fails later | websocket-map not included under `http { }` |

---

## What’s next (Phase 2 — not done yet)

1. Deploy React app on **Cloudflare Pages**
2. Point SPA at `https://YOUR_API_HOST` via `VITE_API_URL` / `VITE_WS_URL`
3. Set `FRONTEND_URL` in `.env` to the Pages URL (CORS)
