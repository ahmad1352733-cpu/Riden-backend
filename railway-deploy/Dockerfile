FROM node:22-alpine
WORKDIR /app
COPY dist ./dist
COPY package.json ./
EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
