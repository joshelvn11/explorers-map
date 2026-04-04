FROM node:23-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm build:web

FROM node:23-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production \
  EXPLORERS_MAP_SQLITE_PATH=/app/data/explorers-map.sqlite \
  HOSTNAME=0.0.0.0 \
  PORT=3000

RUN corepack enable

COPY --from=build /app /app

RUN mkdir -p /app/data \
  && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["pnpm", "docker:start:web"]
