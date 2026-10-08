FROM node:22-alpine
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @army3d/shared build && pnpm --filter @army3d/client build
WORKDIR /repo/apps/client
EXPOSE 4173
CMD ["pnpm", "vite", "preview", "--host", "0.0.0.0", "--port", "4173"]
