# ── Build stage ────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config and all package manifests first (layer cache)
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/shared/package.json ./packages/shared/
COPY tsconfig.base.json ./

# Install all dependencies (including dev — needed for build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared

# Build shared first, then backend
RUN pnpm --filter @reflexa/shared run build
RUN pnpm --filter @reflexa/backend run build

# ── Production stage ───────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built output from builder
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Cloud Run sets PORT env var automatically
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Run the compiled backend
CMD ["node", "packages/backend/dist/index.js"]
