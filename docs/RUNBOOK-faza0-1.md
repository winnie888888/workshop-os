# Runbook — Faza 0 (pravi backend) + Faza 1 (uvoz strank)

Cilj: pognati pravo bazo, naliti 16 migracij, seedati A-SPRINT tenant in **uvoziti
999 pravih strank iz Minimaxa**. Uvoz teče **neposredno v bazo** (ne potrebuje
prijave). Za brskanje po pravih podatkih v spletni aplikaciji je nato potreben
še korak avtentikacije (glej Korak 6).

Ukazi so za **Windows PowerShell** (tvoje okolje). Linux/macOS: enako, le
`$env:X="..."` → `export X=...`.

---

## Korak 1 — Postgres

```powershell
cd C:\Users\devot\Desktop\workshop-os-complete
docker compose up -d db
```
Baza teče na `localhost:5432` (uporabnik/geslo/baza = `workshop`).

## Korak 2 — DATABASE_URL

```powershell
$env:DATABASE_URL = "postgres://workshop:workshop@localhost:5432/workshop"
```

## Korak 3 — Migracije (16 datotek)

```powershell
pnpm migrate
```
Pričakovano: `+ apply 0001_foundation.sql … 0016_rental_management.sql` → `migrations complete`.

## Korak 4 — Seed: tenant + 999 strank

```powershell
# A-SPRINT tenant + lastnik + lokacija
Get-Content db\seed\0001_seed_tenant.sql -Raw | docker compose exec -T db psql -U workshop -d workshop

# 999 strank iz Minimax izvoza (idempotentno)
Get-Content db\seed\0002_customers_minimax.sql -Raw | docker compose exec -T db psql -U workshop -d workshop
```

## Korak 5 — Preveri

```powershell
docker compose exec db psql -U workshop -d workshop -c "select count(*) from app.customers;"
docker compose exec db psql -U workshop -d workshop -c "select name, country, vat_id from app.customers where country='SI' limit 5;"
```
Pričakovano: `count = 999` in nekaj slovenskih strank z DDV ID.

➡️ **Faza 1 je s tem končana** — v bazi so prave stranke. Uvoz lahko kadarkoli
ponoviš (upsert po Minimax ID, brez podvajanja).

---

## Korak 6 — API + spletna aplikacija na pravih podatkih

`apps/api/.env` (za zagon API-ja):
```
DATABASE_URL=postgres://workshop:workshop@localhost:5432/workshop
PORT=3001
NODE_ENV=development
STORAGE_DRIVER=local
LOCAL_STORAGE_DIR=.storage
DEFAULT_VAT_RATE_PCT=22
DEFAULT_LABOUR_RATE_MINOR=6500
WEB_APP_BASE_URL=http://localhost:3000
PUBLIC_API_BASE_URL=http://localhost:3001
PORTAL_BASE_URL=http://localhost:3000/portal
# OIDC — glej spodaj (obvezno za zagon)
OIDC_ISSUER=...
OIDC_AUDIENCE=...
```

`apps/web/.env.local` (izklop demo, kazanje na pravi API):
```
NEXT_PUBLIC_DEMO=0
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

Zagon (dva terminala):
```powershell
# API
$env:DATABASE_URL="postgres://workshop:workshop@localhost:5432/workshop"; pnpm --filter @workshop/api start:dev
# Web
pnpm --filter @workshop/web dev
```

### ⚠️ Avtentikacija (blokira Korak 6)
API **zahteva** `OIDC_ISSUER` + `OIDC_AUDIENCE` za zagon in vse zahteve preverja
proti identitetnemu ponudniku (JWT/JWKS). Dev-poti trenutno ni. Dve možnosti:

- **A (priporočeno) — varovan dev-login:** dodam strogo dev-omejen način
  (`DEV_AUTH=1`, samo ko `NODE_ENV≠production`), ki vstavi fiksnega A-SPRINT
  lastnika. Tako brskaš po pravih podatkih brez IdP. Pripravim kot naslednji korak.
- **B — lokalni Keycloak:** poženem Keycloak (docker) + nastavim `OIDC_*`. Brez
  spremembe kode, a več postavitve.

Dokler tega ne uredimo, Korak 1–5 vseeno naredijo bazo s pravimi strankami
(preverljivo prek `psql`).

---

## Naslednje (ko bo backend pokonci)
- **Dev-login** (A) → pravi podatki v UI.
- **Minimax živa sinhronizacija**: potrebujem `client_id` + `client_secret`
  (registracija API aplikacije), **API geslo** (Gesla za dostop do zunanjih
  aplikacij) in **orgId** (+ test/produkcija).
- VIES vklop (brezplačno), nato AJPES/Bizi (ključ).
