FROM node:20-alpine
WORKDIR /workspace
COPY artifacts/api-server/dist ./artifacts/api-server/dist
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
