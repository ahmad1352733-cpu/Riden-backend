FROM node:20-alpine AS builder
WORKDIR /workspace

# Install pnpm
RUN npm install -g pnpm@10.11.0

# Copy workspace config first (for caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy only package.json files needed for api-server and its workspace deps
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY artifacts/api-server/package.json ./artifacts/api-server/

# Install only api-server + its workspace dependencies (skip Expo/React Native/etc.)
RUN pnpm install --filter @workspace/api-server... --no-frozen-lockfile

# Copy source files
COPY lib/db/src ./lib/db/src
COPY lib/api-zod/src ./lib/api-zod/src
COPY artifacts/api-server/src ./artifacts/api-server/src
COPY artifacts/api-server/build.mjs ./artifacts/api-server/

# Build (esbuild bundles everything into a single file)
RUN pnpm --filter @workspace/api-server run build

# ---- Runtime image ----
FROM node:20-alpine
WORKDIR /workspace

COPY --from=builder /workspace/artifacts/api-server/dist ./artifacts/api-server/dist

ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080
CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
