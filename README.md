# MailFlow - Bulk Email Campaign Platform

A managed bulk email campaign platform. Customers sign in with credentials you provide — there is no public signup. Built with React, Express, BullMQ, Redis, and PostgreSQL.

## Features

- **Campaign Management**: Create, duplicate, and manage email campaigns
- **CSV/XLSX Upload**: Upload recipient lists with dynamic variable support
- **Email Preview**: Preview rendered emails before sending
- **SendGrid Delivery**: Per-browser SendGrid settings for campaign delivery
- **Concurrent Sending**: 5 concurrent workers powered by BullMQ + Redis
- **Real-Time Progress**: WebSocket-based live progress tracking
- **Campaign Analytics**: Dashboard with charts and statistics
- **Role-Based Access**: Admin and Manager roles
- **Dark Mode**: Full dark/light theme support

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Queue**: BullMQ + Redis
- **Real-Time**: WebSockets (ws)
- **Auth**: JWT + bcrypt

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL and Redis)

### 1. Start Infrastructure

```bash
docker compose up -d
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env  # Edit if needed
npx prisma generate
npx prisma db push
npm run prisma:seed    # Creates admin user (set SEED_ADMIN_* in .env)
npm run dev            # Starts on http://localhost:3001
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev  # Starts on http://localhost:5173
```

### 4. Login

Open http://localhost:5173 and sign in with credentials you provision in `.env` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

### Managed access model

- **No signup page** — users cannot create accounts themselves
- **You provision logins** — set `SEED_ADMIN_*` in `.env` on deploy, or add users directly in the database
- **Billing / access** — managed by you on your own schedule (e.g. monthly); the app does not handle payments or self-service plans

## Project Structure

```
mailflow/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── src/
│   │   ├── config/            # Environment config
│   │   ├── middleware/        # Auth, rate limiting
│   │   ├── providers/         # SendGrid provider
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── types/            # TypeScript types
│   │   └── workers/          # BullMQ workers
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Layout, shared UI
│   │   ├── context/          # Auth context
│   │   ├── pages/            # Route pages
│   │   ├── services/         # API client
│   │   └── types/            # TypeScript types
│   └── package.json
└── docker-compose.yml
```

## Deployment

### Full app — one image (recommended)

Build **frontend + backend + nginx** as `mailflow-app` on your laptop, load on EC2 (no build on the server):

```bash
# laptop
./scripts/build-release.sh
# scp mailflow-app.tar.gz + project → EC2, then:
gunzip -c ~/mailflow-app.tar.gz | docker load
cp .env.example .env   # FRONTEND_URL=http://YOUR_IP:8080 , JWT + SEED_ADMIN_*
./scripts/ec2-release-up.sh
# open http://YOUR_IP:8080
```

Guide: **[docs/DEPLOY_RELEASE.md](docs/DEPLOY_RELEASE.md)**

### Backend only (API / Postman)

```bash
# laptop: ./scripts/build-backend-image.sh → load on EC2
./scripts/ec2-safe-up.sh
```

Details: **[docs/DEPLOY_BACKEND_DOCKER.md](docs/DEPLOY_BACKEND_DOCKER.md)**

Nginx site file (also pasted in that doc): [`deploy/nginx-api.conf`](deploy/nginx-api.conf)

### Full stack (API + SPA in Docker)

```bash
cp .env.example .env          # Edit JWT_SECRET and FRONTEND_URL for production
docker compose up -d --build  # Builds and starts all services
```

For **EC2 + custom domain** with the frontend container, see **[deploy/EC2.md](deploy/EC2.md)** and use `deploy/.env.production.example`.

Open **http://localhost** (or the port set via `APP_PORT` in `.env`, default `80`).

Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env` before first deploy.

### Production checklist

1. Set a strong `JWT_SECRET` in `.env`
2. Set `FRONTEND_URL` to your public URL (e.g. `https://mail.yourcompany.com`)
3. Set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, then `SEED_ON_START=false` after first deploy
4. Sign in and save SendGrid sender email, API key, and template ID in **Settings**; they are stored in that browser only
5. Put a reverse proxy with TLS in front for public access when needed

### Useful commands

```bash
docker compose logs -f backend   # API logs
docker compose ps                # Service status
docker compose down              # Stop everything
docker compose down -v           # Stop and wipe database volumes
```

### Local development (DB/Redis only in Docker)

```bash
docker compose up -d postgres redis
cd backend && npm install && cp .env.example .env && npx prisma db push && npm run prisma:seed && npm run dev
cd frontend && npm install && npm run dev
```

Use ports **5434** (Postgres) and **6380** (Redis) from `backend/.env.example` when connecting from the host.

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/login | User login |
| GET | /api/auth/profile | Get user profile |
| GET | /api/dashboard/stats | Dashboard statistics |
| GET | /api/campaigns | List campaigns |
| POST | /api/campaigns | Create campaign |
| GET | /api/campaigns/:id | Get campaign details |
| POST | /api/campaigns/:id/upload | Upload recipients CSV/XLSX |
| POST | /api/campaigns/:id/start | Start campaign sending |
| POST | /api/campaigns/:id/duplicate | Duplicate campaign |
| GET | /api/campaigns/:id/export-failed | Export failed emails |
| POST | /api/campaigns/parse-csv | Parse CSV preview |
| WS | /ws | WebSocket real-time updates |

## Email Providers

The platform uses a provider abstraction pattern:

- **SendGridProvider**: Uses `@sendgrid/mail`
- **SendGridProvider**: Uses `@sendgrid/mail`; its API key is supplied from browser Settings only when a campaign is sent
