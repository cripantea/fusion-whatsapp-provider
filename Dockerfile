# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv;error=false
#
# Nota sul warning "SecretsUsedInArgOrEnv" sulle ENV placeholder nello stage builder:
# sono valori fittizi usati SOLO per far superare a `next build` la fase di analisi
# statica delle route (che istanzia i client Prisma/Redis/Stripe). Non sono segreti
# reali e vengono sempre sovrascritti a runtime dalle variabili di docker-compose.

FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ---- deps: install dependencies once, shared by builder and worker ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: generate the Prisma client and build the Next.js standalone output ----
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

# `next build` importa (e quindi istanzia) i client Prisma/Redis/Stripe per tracciare
# le route: servono variabili "placeholder" solo per superare questa fase statica.
# A runtime i valori reali arrivano da docker-compose (env_file/environment) e le
# sostituiscono, perché il processo standalone li rilegge da zero all'avvio.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV REDIS_URL="redis://localhost:6379"
ENV STRIPE_SECRET_KEY="sk_test_placeholder"
ENV NEXTAUTH_SECRET="build-time-placeholder-not-used-at-runtime"
RUN npm run build

# ---- runner: minimal production image for the Next.js dashboard/API ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]

# ---- worker: full-source image for the Redis webhook forwarder, cron jobs and Prisma CLI ----
# Non può usare l'output "standalone" di Next.js: esegue script TypeScript sorgente
# (tsx) e i comandi `prisma generate`/`migrate deploy` in fase di deploy.
FROM base AS worker
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# L'immagine gira come utente "node" (non root): senza questo chown, un secondo
# `prisma generate`/`migrate deploy` lanciato a runtime (es. dal workflow di deploy)
# fallirebbe con EACCES perché i file generati in fase di build appartengono a root.
RUN chown -R node:node /app
USER node
CMD ["npm", "run", "worker"]
