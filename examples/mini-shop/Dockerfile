# Build context: repo root (../..)
# The image bundles yaoi (built) and the mini-shop example, so the same image
# can run `migrate:up`, `seed`, and the Fastify server.

FROM node:20-alpine AS yaoi-build
WORKDIR /yaoi
COPY package.json package-lock.json tsconfig.json tsconfig.build.json ./
COPY bin ./bin
COPY src ./src
RUN npm ci --no-audit --no-fund \
  && npm run build \
  && npm prune --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /repo
# Place the prebuilt yaoi where the example's "file:../.." dependency expects it
COPY --from=yaoi-build /yaoi/package.json ./package.json
COPY --from=yaoi-build /yaoi/dist ./dist
COPY --from=yaoi-build /yaoi/bin ./bin

WORKDIR /repo/examples/mini-shop
COPY examples/mini-shop/package.json examples/mini-shop/tsconfig.json examples/mini-shop/yaoi.config.ts ./
COPY examples/mini-shop/migrations ./migrations
COPY examples/mini-shop/src ./src

RUN npm install --no-audit --no-fund

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
