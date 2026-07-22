# ─── Build Stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /workspace

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace manifest files (cached layer — only re-runs if lockfile changes)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# Copy package.json for each required workspace package
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY lib/db/package.json                ./lib/db/
COPY lib/api-zod/package.json           ./lib/api-zod/

# Install dependencies for api-server and its workspace deps only
RUN pnpm install --frozen-lockfile \
      --filter @workspace/api-server \
      --filter @workspace/db \
      --filter @workspace/api-zod

# Copy source files (changing source only invalidates from here, not the install layer)
COPY tsconfig.base.json ./
COPY artifacts/api-server/src         ./artifacts/api-server/src
COPY artifacts/api-server/build.mjs   ./artifacts/api-server/
COPY artifacts/api-server/tsconfig.json ./artifacts/api-server/
COPY lib/db/src                        ./lib/db/src
COPY lib/db/tsconfig.json              ./lib/db/
COPY lib/api-zod/src                   ./lib/api-zod/src
COPY lib/api-zod/tsconfig.json         ./lib/api-zod/

# Build — produces ./artifacts/api-server/dist/index.mjs (fully self-contained bundle)
RUN pnpm --filter @workspace/api-server build

# ─── Production Stage ─────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /workspace

COPY --from=builder /workspace/artifacts/api-server/dist ./artifacts/api-server/dist

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
