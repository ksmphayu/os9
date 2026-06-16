# ─── Stage 1: deps ───────────────────────────────────────────────────────────
# Install production + dev deps inside Alpine so native binaries (e.g. sharp)
# match the target OS (linux/musl), not the developer's Windows machine.
FROM node:24-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ─── Stage 2: builder ────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# API_BASE_URL is evaluated at build time to configure Next.js rewrite rules.
# It is NOT a secret — override with --build-arg for non-default environments.
# All runtime secrets (OIDC_*, BETTER_AUTH_*) are injected by Kubernetes at
# runtime and must NOT be set here.
ARG API_BASE_URL=http://localhost:8081
ENV API_BASE_URL=$API_BASE_URL

RUN npm run build

# ─── Stage 3: runner ─────────────────────────────────────────────────────────
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
