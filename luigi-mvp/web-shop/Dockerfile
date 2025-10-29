FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Final image only ships Next standalone server + static assets
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
EXPOSE 8080

# Copy the minimal standalone output
COPY --from=build /app/.next/standalone ./        
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# If your start script is "next start -p 8080", IGNORE it here:
# use the standalone server directly:
CMD ["node", "server.js"]
