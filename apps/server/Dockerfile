FROM node:22-alpine
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @army3d/shared build && pnpm --filter @army3d/server build
WORKDIR /repo/apps/server
EXPOSE 3000
CMD ["node", "dist/main.js"]
