FROM node:22-alpine

WORKDIR /app

# Copy only the pre-built dist — esbuild already bundled everything
COPY artifacts/api-server/dist ./dist

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
