# Produkcijski deploy — AI Workshop OS (A-SPRINT GARAGE)

Vodnik za postavitev na en VPS (Hetzner / DigitalOcean / Contabo …) z Dockerjem.
Cilj: stabilen, varen prvi go-live za eno delavnico. Skaliranje na več instanc
opisuje `SCALING.md` — ta dokument pokriva **prvo postavitev**.

Arhitektura ob zagonu: en `db` (Postgres 16), ena ali več `api` replik
(stateless), en `worker` (outbox + opomniki — singleton), reverse-proxy (Caddy)
za TLS pred API in spletno aplikacijo. Spletni del (Next.js) je na Vercelu ali
v lastnem kontejnerju; ta vodnik predpostavlja **API + bazo na VPS**, splet na
Vercelu (kot dosedanji `workshop-os-delta.vercel.app`).

---

## 0. Predpogoji

- VPS z Ubuntu 22.04/24.04, vsaj 2 vCPU / 4 GB RAM (priporočeno 4 vCPU / 8 GB).
- Domeni/poddomeni, ki kažeta na IP strežnika:
  - `api.example.com` → API
  - (po želji) `app.example.com` → splet, če ga gostiš sam; sicer Vercel.
- SSH dostop kot ne-root uporabnik s `sudo`.

---

## 1. Strežnik: Docker + osnovna varnost

```bash
# Docker Engine + compose plugin (uradni skript)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER        # odjavi/prijavi se, da velja
docker --version && docker compose version

# Požarni zid: pusti SSH + HTTP(S), ostalo zapri
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp
sudo ufw enable

# (priporočeno) samodejne varnostne posodobitve
sudo apt-get update && sudo apt-get install -y unattended-upgrades
```

> **Postgres porta NE odpiraj navzven.** Baza je dosegljiva samo znotraj
> Docker omrežja (med `api`/`worker` in `db`). UFW pusti 5432 zaprt.

---

## 2. Koda + okolje

```bash
git clone https://github.com/winnie888888/workshop-os.git
cd workshop-os

# Produkcijske spremenljivke
cp .env.production.example .env
nano .env        # izpolni [OBVEZNO] polja (glej spodaj)
```

**Skrivnosti (fail-fast — brez njih se API ne zažene):**

```bash
# Generiraj dva močna secreta in ju prilepi v .env:
openssl rand -hex 32   # -> PORTAL_TOKEN_SECRET
openssl rand -hex 32   # -> LOCAL_STORAGE_SIGNING_SECRET
```

Obvezno izpolni še: `DATABASE_URL` (+ `POSTGRES_PASSWORD` enak kot v URL),
`OIDC_ISSUER`, `OIDC_AUDIENCE`, javne naslove (`WEB_APP_BASE_URL`,
`PUBLIC_API_BASE_URL`, `PORTAL_BASE_URL`). Ostalo (Resend, Infobip, S3, Stripe)
po potrebi — prazno pomeni, da je tista funkcija izklopljena (varno).

---

## 3. Prvi zagon (baza + API + worker)

Uporabi `docker-compose.scale.yml` (na repozitoriju), ki ima stateless API in
namenski worker. Za eno instanco zadošča ena `api` replika.

```bash
# Zgradi sliko + zaženi bazo prvo (da je zdrava pred migracijo)
docker compose -f docker-compose.scale.yml up -d db
docker compose -f docker-compose.scale.yml ps      # počakaj 'healthy'

# Migracije (ustvarijo shemo, role workshop_app, grante, RLS)
docker compose -f docker-compose.scale.yml run --rm api pnpm --filter @workshop/api migrate

# Zaženi API + worker
docker compose -f docker-compose.scale.yml up -d
docker compose -f docker-compose.scale.yml ps
```

**Preveri, da je živo (interno):**

```bash
# Liveness (proces teče)
docker compose -f docker-compose.scale.yml exec api wget -qO- http://localhost:3000/health
# Readiness (DB povezava) — mora vrniti status ready
docker compose -f docker-compose.scale.yml exec api wget -qO- http://localhost:3000/health/ready
```

> Worker teče **samo** v `worker` storitvi (`OUTBOX_POLL_MS>0`). Na `api`
> replikah naj bo `OUTBOX_POLL_MS=0` in `REMINDERS_SWEEP_MS=0`, da se opravila
> ne podvajajo. To je že nastavljeno v `docker-compose.scale.yml`.

---

## 4. Reverse-proxy + TLS (Caddy)

Caddy samodejno pridobi in obnavlja Let's Encrypt certifikate. Dodaj poleg
obstoječih storitev (ali kot ločen compose). Primer `Caddyfile`:

```
api.example.com {
    reverse_proxy api:3000
    encode gzip
    header -Server
}
```

Minimalni dodatek v compose (omrežje deljeno z `api`):

```yaml
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks: [default]
# volumes: caddy_data: {}  caddy_config: {}
```

Po zagonu je API na `https://api.example.com` z veljavnim certifikatom. CORS na
API spusti `WEB_APP_BASE_URL` — poskrbi, da se ujema s tvojo spletno domeno.

> **Splet (Next.js):** če je na Vercelu, nastavi `NEXT_PUBLIC_API_BASE_URL` na
> `https://api.example.com`. Če ga gostiš sam, dodaj še en blok v `Caddyfile`
> za `app.example.com` → `web:3000` in spletni kontejner v compose.

---

## 5. Varnostne kopije baze

Podatki živijo v Docker volumnu `pgdata`. **Reden dump je obvezen.**

```bash
# Ročni dump (shrani izven strežnika!)
docker compose -f docker-compose.scale.yml exec -T db \
  pg_dump -U workshop -d workshop --clean --if-exists > backup-$(date +%F).sql

# Obnovitev (v prazno bazo)
cat backup-YYYY-MM-DD.sql | docker compose -f docker-compose.scale.yml exec -T db \
  psql -U workshop -d workshop
```

Avtomatiziraj prek `cron` (npr. dnevno ob 3h) + sinhronizacija dumpa na
oddaljeni prostor (S3/drug strežnik). Pri obnovitvi v **novo** instanco ne
pozabi na role/grante — če uporabljaš `pg_dumpall --roles-only` ločeno, jih
uvozi pred shemo; sicer migracije ob čisti bazi ustvarijo `workshop_app` + grante.

---

## 6. Posodobitve (nova verzija kode)

```bash
cd workshop-os
git pull
docker compose -f docker-compose.scale.yml build api
# Migracije, če so nove (idempotentno — obstoječe preskoči)
docker compose -f docker-compose.scale.yml run --rm api pnpm --filter @workshop/api migrate
docker compose -f docker-compose.scale.yml up -d
```

Brez izpada več replik: posodabljaj `api` replike postopno (rolling), `worker`
nazadnje. Za eno instanco kratek izpad ob `up -d` je sprejemljiv.

---

## 7. Kontrolni seznam pred go-live

- [ ] `.env`: vsa `[OBVEZNO]` polja izpolnjena; `DEV_AUTH` **odsoten**.
- [ ] `PORTAL_TOKEN_SECRET` in `LOCAL_STORAGE_SIGNING_SECRET` ≥ 32 znakov (openssl).
- [ ] `NODE_ENV=production`.
- [ ] Migracije uspele; `/health/ready` vrača `ready`.
- [ ] TLS deluje (`https://api.example.com`), HTTP se preusmeri.
- [ ] CORS: `WEB_APP_BASE_URL`/`PUBLIC_API_BASE_URL` se ujemata s pravimi domenami.
- [ ] Postgres port (5432) **ni** odprt v UFW.
- [ ] Prvi backup narejen in shranjen izven strežnika.
- [ ] OIDC prijava deluje (testni uporabnik se prijavi).
- [ ] Rate-limit aktiven (throttler), `/health` ga ne troši (@SkipThrottle).
- [ ] (če e-računi) `PEPPOL_AP_BASE_URL` nastavljen; sicer dokumenti ostanejo lokalni.

---

## Pogoste težave

- **API se ne zažene, „… is required in production":** manjka obvezni secret/OIDC
  v `.env`. Preglej sporočilo — pove točno ime spremenljivke.
- **`/health/ready` vrača 503:** baza ni dosegljiva. Preveri `db` (`healthy`?),
  `DATABASE_URL`, omrežje.
- **CORS napake v brskalniku:** `WEB_APP_BASE_URL` se ne ujema s spletno domeno.
- **SMS/e-pošta ne gre:** ustrezni ključ v `.env` je prazen → routing pade na
  logging stub (namerno; nič se ne »izgubi«, le ni poslano).
- **Worker dela isto dvakrat:** več storitev ima `OUTBOX_POLL_MS>0`. Samo
  `worker` sme polliti; API replike `=0`.
