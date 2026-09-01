# syntax=docker/dockerfile:1

ARG NODE_VERSION=24-slim

# --- deps: install from the lockfile, nothing else --------------------------
FROM node:${NODE_VERSION} AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# --- builder: produce .next/standalone --------------------------------------
FROM node:${NODE_VERSION} AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- runtime: server.js plus the assets it cannot trace ---------------------
FROM node:${NODE_VERSION} AS runner

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# public/ and .next/static are not part of the traced output and must be
# copied alongside it, or the app serves HTML with every asset 404ing.
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

CMD ["node", "server.js"]
