# ── Build stage ────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config and manifests first (layer cache optimization)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/
COPY tsconfig.base.json ./

# Install all dependencies (dev included — needed for TypeScript build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared

# Build shared first, then backend
RUN pnpm --filter @reflexa/shared run build
RUN pnpm --filter reflexa-backend run build

# ── Production stage ───────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/

# Production deps only — no dev dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from builder
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "packages/backend/dist/index.js"]
