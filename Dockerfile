# ============================================================================
# ADUVA GARAJ - ÇOK AŞAMALI (MULTI-STAGE) ÜRETİM DOCKERFILE (B4)
# ============================================================================

# 1. Aşama: Bağımlılıklar ve Derleme (Builder)
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY package.json pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --no-frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY apps/web ./apps/web

RUN pnpm --filter @aduva/api prisma:generate
RUN pnpm --filter @aduva/shared build && pnpm --filter @aduva/api build

# 2. Aşama: Güvenli ve Hafif Üretim Çalışma Zamanı (Runner)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV API_PORT=4000

# En az yetki ilkesi: root olmayan kullanıcı ile çalıştır
RUN addgroup --system --gid 1001 aduva && adduser --system --uid 1001 aduva

COPY --from=builder --chown=aduva:aduva /app/node_modules ./node_modules
COPY --from=builder --chown=aduva:aduva /app/packages/shared ./packages/shared
COPY --from=builder --chown=aduva:aduva /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=aduva:aduva /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=aduva:aduva /app/server.mjs ./server.mjs

USER aduva
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "apps/api/dist/main.js"]
