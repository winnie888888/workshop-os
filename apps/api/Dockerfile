# ============================================================================
# AI Workshop OS — API + worker (ista slika, vedenje krmili okolje).
#
# Worker NI ločen artefakt: WorkerModule teče znotraj iste NestJS aplikacije,
# krmiljen prek OUTBOX_POLL_MS / REMINDERS_SWEEP_MS. Zato ena slika, en entry
# (dist/main.js):
#   - API replika:  OUTBOX_POLL_MS=0, REMINDERS_SWEEP_MS=0  (ne drainа)
#   - worker:       OUTBOX_POLL_MS>0, REMINDERS_SWEEP_MS>0  (edini drainа)
# (glej docker-compose.scale.yml in SCALING.md)
#
# pnpm monorepo: packages/shared se zgradi PRED apps/api (API tsc bere dist/).
# Večstopenjski build → tanka, non-root runtime slika.
# ============================================================================

# ---- Stopnja 1: build ------------------------------------------------------
FROM node:22-bookworm-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

# Manifesti najprej (boljši docker cache za odvisnosti).
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
# (web ni del API slike)
RUN pnpm install --frozen-lockfile

# Korenski tsconfig, ki ga oba paketa DEDUJETA (extends ../../tsconfig.base.json).
# Brez njega shared/api tsc pade na privzeti star target (BigInt/iterator napake).
COPY tsconfig.base.json ./

# Izvorna koda + build: shared → api.
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/
# Migracije (SQL) — niso del TS builda, a jih runtime rabi za `pnpm migrate`.
COPY db/ db/
RUN pnpm --filter @workshop/shared build
RUN pnpm --filter @workshop/api build

# Produkcijske odvisnosti (brez dev) za runtime stopnjo.
RUN pnpm --filter @workshop/api --prod deploy /app-deploy

# ---- Stopnja 2: runtime ----------------------------------------------------
FROM node:22-bookworm-slim AS runtime
# dumb-init: pravilno posreduje SIGTERM Nodu (graceful shutdown med deployi).
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app

# Zgrajen API (dist + prod node_modules) iz deploy izhoda.
COPY --from=build /app-deploy/ ./
# Migracijske datoteke (SQL) + skripta — runtime jih rabi za `pnpm migrate`.
COPY --from=build /repo/apps/api/scripts ./scripts
COPY --from=build /repo/db ./db

# Non-root (varnost: proces ne teče kot root).
USER node

EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
