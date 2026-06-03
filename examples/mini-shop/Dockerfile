# Build context: examples/mini-shop (this directory).
# The example depends on the published @iriskaik/yaoi from npm, so the image
# only installs dependencies and runs migrate:up / seed / the Fastify server
# off the same image.

FROM node:20-alpine
WORKDIR /app

# Install dependencies first for better layer caching. NODE_ENV is set to
# production only after install so devDependencies (typescript) are available
# to ts-node at runtime.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json yaoi.config.ts ./
COPY migrations ./migrations
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
