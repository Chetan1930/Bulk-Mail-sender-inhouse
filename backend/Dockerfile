# Single npm install (low RAM). Avoids two full `npm ci` peaks that freeze 1GB EC2s.
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

# Limit Node heap during install/build on small hosts
ENV NODE_OPTIONS=--max-old-space-size=512

COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Fewer parallel sockets = lower peak memory
RUN npm ci --maxsockets 1 \
  && npx prisma generate \
  && npm cache clean --force

COPY tsconfig.json ./
COPY src ./src
COPY docker-entrypoint.sh ./

RUN npm run build \
  && npm prune --omit=dev \
  && npm install prisma --no-save --maxsockets 1 \
  && npm cache clean --force

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=384

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
