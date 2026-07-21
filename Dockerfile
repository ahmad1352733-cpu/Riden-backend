FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10

# Copy workspace config files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.base.json tsconfig.json ./

# Copy lib packages (dependencies of api-server)
COPY lib/db/ ./lib/db/
COPY lib/api-zod/ ./lib/api-zod/
COPY lib/api-spec/ ./lib/api-spec/

# Copy api-server source
COPY artifacts/api-server/ ./artifacts/api-server/

# Install dependencies (only for the packages we copied)
RUN pnpm install --filter @workspace/api-server... --frozen-lockfile

# Build
RUN pnpm --filter @workspace/api-server run build

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
