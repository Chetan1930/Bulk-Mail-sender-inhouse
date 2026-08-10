# All-in-one MailFlow image: React SPA + Express API + nginx
# Build on a laptop (enough RAM), load on EC2 — never build this on 1GB instances.
#
#   docker build -t mailflow-app:latest .
#   ./scripts/build-release.sh

# ----- Frontend -----
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
ENV NODE_OPTIONS=--max-old-space-size=1024
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --maxsockets 1 && npm cache clean --force
COPY frontend/ ./
RUN npm run build && npm cache clean --force

# ----- Backend -----
FROM node:20-alpine AS backend-builder
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_OPTIONS=--max-old-space-size=768
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma/
RUN npm ci --maxsockets 1 \
  && npx prisma generate \
  && npm cache clean --force
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build \
  && npm prune --omit=dev \
  && npm install prisma --no-save --maxsockets 1 \
  && npm cache clean --force

# ----- Runtime: nginx + node -----
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl nginx \
  && mkdir -p /run/nginx \
  && rm -f /etc/nginx/http.d/default.conf

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=384
ENV PORT=3001

COPY --from=backend-builder /app/package.json ./
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/prisma ./prisma
COPY --from=frontend-builder /frontend/dist /usr/share/nginx/html
COPY deploy/nginx-app.conf /etc/nginx/http.d/default.conf
COPY docker/start-app.sh /start-app.sh
RUN chmod +x /start-app.sh

EXPOSE 80
CMD ["/start-app.sh"]
