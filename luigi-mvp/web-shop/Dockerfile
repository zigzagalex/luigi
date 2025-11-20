# syntax=docker/dockerfile:1

# --- Base image ---
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# --- Dependencies (pnpm) ---
FROM base AS deps
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- Build stage ---
FROM base AS build
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# next.config.js has output: 'standalone'
RUN pnpm build

# --- Runner (small) ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# 1) Copy standalone server bundle (this includes server.js)
COPY --from=build /app/.next/standalone ./

# 2) Copy static assets where server.js expects them
COPY --from=build /app/.next/static ./.next/static

# 3) Copy public assets
COPY --from=build /app/public ./public

EXPOSE 8080

# server.js is at /app/server.js in the standalone output
CMD ["node", "server.js"]
