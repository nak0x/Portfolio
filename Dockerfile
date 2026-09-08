# syntax=docker/dockerfile:1

# ---- build -----------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

ENV NODE_ENV=development

# install deps first so the layer caches on lockfile changes only.
# --ignore-scripts skips `nuxt prepare`, which needs the source we have not
# copied yet; `nuxt build` runs it anyway.
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY . .

# baked into the client bundle, so it has to be present at build time.
# override with --build-arg SITE_URL=... (coolify: Build Variables)
ARG SITE_URL=https://nak0x.dev
ENV NUXT_PUBLIC_SITE_URL=$SITE_URL

RUN NODE_ENV=production npm run build

# ---- runtime ---------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NITRO_PORT=3000

# nitro's output is self-contained: no node_modules, no package.json needed
COPY --from=build --chown=node:node /app/.output ./.output
# only read when CONTENT_PROVIDER=local; a couple of KB, keeps that path usable
COPY --from=build --chown=node:node /app/content ./content

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz > /dev/null || exit 1

CMD ["node", ".output/server/index.mjs"]
