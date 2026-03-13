FROM node:22-alpine

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY services ./services
COPY packages ./packages
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

WORKDIR /workspace/services/api

EXPOSE 4100

CMD ["corepack", "pnpm", "exec", "tsx", "src/server.ts"]
