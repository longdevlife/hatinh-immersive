FROM node:24.11.1-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@11.3.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc .nvmrc tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY tooling ./tooling

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @hatinh/api build
RUN pnpm deploy --legacy --filter @hatinh/api --prod /app/deploy

FROM node:24.11.1-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

WORKDIR /app

COPY --from=build /app/deploy ./
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/src/core/database/migrations ./dist/core/database/migrations

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

USER node

CMD ["node", "dist/main.js"]
