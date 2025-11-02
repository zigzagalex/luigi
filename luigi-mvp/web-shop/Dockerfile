# syntax=docker/dockerfile:1

# Gemeinsame Basis
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# --- Dependencies (pnpm) ---
FROM base AS deps
# corepack (pnpm) aktivieren
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM base AS build
ENV NODE_ENV=production
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Wichtig: next.config.js hat output: 'standalone'
RUN pnpm build

# --- Runner (klein) ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Standalone-Output + statics kopieren
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./standalone/.next/static
COPY --from=build /app/public       ./standalone/public

EXPOSE 8080
# server.js liegt im Root der Standalone-Ausgabe
CMD ["node","server.js"]
