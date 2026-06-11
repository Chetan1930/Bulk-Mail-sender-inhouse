# MailFlow - Bulk Email Campaign Platform

A self-service bulk email campaign platform for internal company usage. Built with React, Express, BullMQ, Redis, and PostgreSQL.

## Features

- **Campaign Management**: Create, duplicate, and manage email campaigns
- **CSV/XLSX Upload**: Upload recipient lists with dynamic variable support
- **Email Preview**: Preview rendered emails before sending
- **Multiple Providers**: SendGrid and SMTP support (extensible)
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
npm run prisma:seed    # Creates demo users
npm run dev            # Starts on http://localhost:3001
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev  # Starts on http://localhost:5173
```

### 4. Login

Open http://localhost:5173 and login with:

- **Admin**: admin@mailflow.com / admin123
- **Manager**: manager@mailflow.com / manager123

## Project Structure

```
mailflow/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── src/
│   │   ├── config/            # Environment config
│   │   ├── middleware/        # Auth, rate limiting
│   │   ├── providers/         # Email providers (SendGrid, SMTP)
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

## Deployment (Docker)

Deploy the entire app with one command:

```bash
cp .env.example .env          # Edit JWT_SECRET and FRONTEND_URL for production
docker compose up -d --build  # Builds and starts all services
```

For **EC2 + custom domain** (e.g. `http://sendingmail.chetanchauhan.fun`), see **[deploy/EC2.md](deploy/EC2.md)** and use `deploy/.env.production.example`.

Open **http://localhost** (or the port set via `APP_PORT` in `.env`, default `80`).

Default login (when `SEED_ON_START=true`):

- **Admin**: admin@mailflow.com / admin123
- **Manager**: manager@mailflow.com / manager123

### Production checklist

1. Set a strong `JWT_SECRET` in `.env`
2. Set `FRONTEND_URL` to your public URL (e.g. `https://mail.yourcompany.com`)
3. Set `SEED_ON_START=false` after first deploy
4. Configure `SENDGRID_API_KEY` or SMTP settings in `.env`
5. Put a reverse proxy with TLS (Caddy, Nginx, Traefik) in front for public access

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
| POST | /api/auth/register | User registration |
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
- **SmtpProvider**: Uses `nodemailer` (any SMTP server)
- **Extensible**: Add new providers by implementing the `EmailProvider` interface
