# Skaliranje — AI Workshop OS (A-SPRINT GARAGE)

Ta dokument opisuje, kako sistem raste od ene instance do večinstančne
postavitve, in katere nastavitve je treba ob tem spremeniti. Pisan je tako, da
ga lahko upošteva operater brez poglobljenega poznavanja kode.

## Arhitekturno izhodišče

Sistem je **modularni monolit (NestJS) + Postgres + worker**. To je namenoma
*dolgo-živeč strežniški* vzorec, **ne** serverless:

- **Worker** (outbox drain + urni opomniki) zahteva trajni proces — na
  Vercel/Lambda ne teče čisto. Zato API + worker tečeta na dolgo-živečem
  gostitelju (VPS/Docker: Hetzner, DigitalOcean, Fly.io …).
- **Frontend** (Next.js) lahko ostane ločen (npr. Vercel) in govori z API prek
  `NEXT_PUBLIC_API_BASE_URL`.

## Kaj je že pripravljeno za skaliranje

| Lastnost | Stanje |
|---|---|
| **API brez stanja** | Seje so v `app.user_sessions` (baza), ne v pomnilniku procesa → poljubno replik brez sticky-session. |
| **Outbox multi-instance** | `FOR UPDATE SKIP LOCKED` — več worker procesov si dogodkov ne podvoji. |
| **Idempotentni SMS** | Sprožilci uporabljajo `idempotencyKey` z `ON CONFLICT DO NOTHING` → tudi podvojen sweep pošlje en SMS. |
| **Graceful shutdown** | `enableShutdownHooks()` + `pool.end()` + worker `onModuleDestroy` → med deployem se transakcije zaključijo. |
| **Rate-limit pripravljen** | `@nestjs/throttler` vstavljen; store je zamenljiv za Redis (glej spodaj). |
| **Pool nastavljiv** | `DB_POOL_MAX`, timeouti iz okolja. |

## Stopnje rasti

### Stopnja 0 — ena instanca (zdaj)
`docker compose up -d`. API + worker v istem procesu (`OUTBOX_POLL_MS>0`).
Primerno za eno delavnico. Nič posebnega ni treba.

### Stopnja 1 — ločen worker, skalabilen API
`docker compose -f docker-compose.scale.yml up -d --scale api=3`

Spremembe, ki jih ta postavitev uveljavi:
- **API replike** imajo `OUTBOX_POLL_MS=0` in `REMINDERS_SWEEP_MS=0` → ne
  poganjajo workerja (sweepi tečejo le v `worker` storitvi).
- **Worker** je ena sama storitev z `OUTBOX_POLL_MS>0` → edini drainа outbox in
  pošilja urne opomnike. **Ne skaliraj je nad 1.**
- Pred `api` postavi load-balancer/ingress (Traefik, Caddy, nginx).

**Povezave na bazo:** vsaka API replika odpre svoj pool. Velja:
`replike × DB_POOL_MAX < Postgres max_connections`. Compose nastavi
`max_connections=200`; pri 3 replikah × 20 = 60 + worker 10 = 70 < 200. ✔

### Stopnja 2 — deljeni rate-limit (Redis)
Privzeti throttler šteje promet **na proces**. Z več API replikami to pomeni,
da je dejanski limit `limit × število replik` → zaščita pred scrapingom oslabi.

Ko imaš >1 API repliko, aktiviraj deljeni store:

1. Dodaj Redis storitev (compose):
   ```yaml
   redis:
     image: redis:7-alpine
     restart: unless-stopped
   ```
2. Namesti paket: `pnpm --filter @workshop/api add @nest-lab/throttler-storage-redis ioredis`
3. V `app.module.ts` zamenjaj `ThrottlerModule.forRoot([...])` z varianto, ki
   prejme `storage` (obstoječi limiti ostanejo isti):
   ```ts
   ThrottlerModule.forRootAsync({
     inject: [AppConfig],
     useFactory: (cfg: AppConfig) => ({
       throttlers: [{ ttl: 60_000, limit: 120 }],
       storage: new ThrottlerStorageRedisService(cfg.redisUrl),
     }),
   })
   ```
4. Nastavi `REDIS_URL` v API in worker okolju.

Po tem je rate-limit deljen med vsemi replikami (en števec na IP, ne na proces).

### Stopnja 3 — PgBouncer (mnogo replik)
Preko ~5 API replik (ali ob serverless frontendu, ki odpira veliko kratkih
povezav) postavi **PgBouncer** v *transaction* načinu pred Postgres in usmeri
`DATABASE_URL` nanj. Tako stotine app-povezav delijo peščico dejanskih
DB-povezav. Opomba: ob transaction poolingu se izogibaj session-level stanju
(npr. `SET` brez `LOCAL`) — naša koda uporablja izključno `SET LOCAL`/
`set_config(..., true)`, kar je s PgBouncer združljivo.

## Hitri kontrolni seznam pred produkcijo

- [ ] `NODE_ENV=production`
- [ ] `PORTAL_TOKEN_SECRET` in `LOCAL_STORAGE_SIGNING_SECRET` ≥ 32 naključnih znakov
- [ ] `POSTGRES_PASSWORD` močno geslo (ne `workshop`)
- [ ] Worker teče kot **ena** storitev; API replike imajo `OUTBOX_POLL_MS=0`
- [ ] `replike × DB_POOL_MAX < max_connections`
- [ ] Load-balancer/ingress pred API
- [ ] (če >1 replika) Redis store za throttler aktiviran
- [ ] Redni backup `pgdata` volumna (ali managed Postgres z avtomatskimi backupi)
- [ ] TLS terminacija na ingressu; `WEB_APP_BASE_URL` nastavljen (CORS)
