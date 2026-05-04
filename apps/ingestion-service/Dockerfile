FROM node:22-alpine AS builder

RUN npm install -g pnpm@9 --quiet

WORKDIR /workspace

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/mission-control-admin/package.json apps/mission-control-admin/
COPY apps/ingestion-service/package.json      apps/ingestion-service/
COPY apps/webclient/package.json              apps/webclient/
COPY libs/shared/package.json                 libs/shared/
COPY libs/db/package.json                     libs/db/

RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json nx.json ./
COPY libs/                      libs/
COPY apps/ingestion-service/    apps/ingestion-service/

RUN pnpm exec nx build shared \
 && pnpm exec nx build db \
 && pnpm exec nx build ingestion-service

RUN rm -rf node_modules/@ssa/shared node_modules/@ssa/db \
 && mkdir -p node_modules/@ssa \
 && ln -s /workspace/dist/libs/shared node_modules/@ssa/shared \
 && ln -s /workspace/dist/libs/db    node_modules/@ssa/db

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /workspace

COPY --from=builder /workspace/node_modules                    ./node_modules
COPY --from=builder /workspace/dist/apps/ingestion-service     ./dist/apps/ingestion-service
COPY --from=builder /workspace/dist/libs/shared                ./dist/libs/shared
COPY --from=builder /workspace/dist/libs/db                    ./dist/libs/db

RUN rm -rf node_modules/@ssa/shared node_modules/@ssa/db \
 && mkdir -p node_modules/@ssa \
 && ln -s /workspace/dist/libs/shared node_modules/@ssa/shared \
 && ln -s /workspace/dist/libs/db    node_modules/@ssa/db

CMD ["node", "dist/apps/ingestion-service/src/main.js"]
