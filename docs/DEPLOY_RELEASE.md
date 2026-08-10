# Deploy MailFlow as one image (frontend + backend)

Build **once on your laptop**, copy the image to EC2, start with Compose.  
**No `docker build` on the server** (avoids freezing small instances).

Stack on the server:

| Container | Image | Role |
|-----------|--------|------|
| `mailflow-app` | `mailflow-app:latest` (you built) | UI + API + nginx |
| `mailflow-postgres` | `postgres:16-alpine` (pulled) | Database |
| `mailflow-redis` | `redis:7-alpine` (pulled) | BullMQ queue |

Open: `http://YOUR_EC2_IP:8080`

---

## On your laptop

```bash
cd /path/to/MailSender
chmod +x scripts/*.sh
./scripts/build-release.sh
# → mailflow-app.tar.gz
```

Copy project + image (example):

```bash
# Image
scp -i your-key.pem mailflow-app.tar.gz ubuntu@YOUR_EC2_IP:~/

# Compose/scripts/env (no node_modules)
rsync -avz --exclude node_modules --exclude .git --exclude 'mailflow-*.tar.gz' \
  -e "ssh -i your-key.pem" \
  ./ ubuntu@YOUR_EC2_IP:~/MailSender/
```

---

## On EC2 (fresh machine)

### 1. Install Docker (once)

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

Log out / SSH back in. Open security group **8080** (and 22).

### 2. Load image + configure

```bash
gunzip -c ~/mailflow-app.tar.gz | docker load

cd ~/MailSender
cp .env.example .env
nano .env
```

Set:

```env
APP_PORT=8080
FRONTEND_URL=http://YOUR_EC2_IP:8080
JWT_SECRET=<openssl rand -hex 32>
SEED_ON_START=true
SEED_ADMIN_EMAIL=you@company.com
SEED_ADMIN_PASSWORD=strong-password
SEED_ADMIN_NAME=Admin
```

If you use a domain later, set `FRONTEND_URL=http://your.domain` (or https) to match the browser.

### 3. Start (no build)

```bash
chmod +x scripts/ec2-release-up.sh
./scripts/ec2-release-up.sh
```

### 4. Use the app

Browser: `http://YOUR_EC2_IP:8080` → login with seeded admin.

Health: `curl -s http://YOUR_EC2_IP:8080/health`

---

## Day-2

```bash
cd ~/MailSender
docker compose -f docker-compose.release.yml ps
docker compose -f docker-compose.release.yml logs -f app
docker compose -f docker-compose.release.yml down          # keep DB
docker compose -f docker-compose.release.yml down -v       # wipe DB
```

After updating code: rebuild on laptop → `scp` new tar → `docker load` → 

```bash
docker compose -f docker-compose.release.yml up -d
```

---

## Optional: host nginx + HTTPS

Point host nginx at `127.0.0.1:8080`, then Certbot. Set `FRONTEND_URL` to the public `https://...` URL and recreate the app container.
