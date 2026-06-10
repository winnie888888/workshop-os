# LAUNCH CHECKLIST — pot do "code-complete"

> **Definicija:** vse, kar mora biti SPROGRAMIRANO za javni launch. Izrecno IZVEN obsega: go-live ops (selitev na Hetzner, store submission, živi ključi Stripe/SMTP/SMS, registracija ponudnika e-poti, AJPES credentials).
> **Vir:** sistematični avdit repoja, 10. 6. 2026 (DEMO_MODE scan, api.ts ↔ controller križni pregled, infra grep). Posodabljaj ob vsakem shipu.

## ✅ Že production-grade (jedro je zgrajeno)

- [x] Multi-tenant temelj: RLS (FORCE) povsod, tenant_id, gapless števci, audit hash-veriga, RBAC matrika
- [x] 32 backend controllerjev / 24 modulov: stranke (+ VIES lookup), vozila, flote, delovni nalogi, predračuni, koledar, računi (VAT engine, dobropisi, plačila), skladišče (prevzemi, naročila, inventura, premiki), dobavitelji, najem vozil, evidenca ur/potni nalogi, portal, iskanje, priloge, AI (glas→nalog, OCR prevzem, tablice, manager insights), poročila, activity feed
- [x] e-SLOG / EN 16931 UBL izvoz; Minimax + e-invoice outbox eventi; OutboxHandler infrastruktura z Minimax handlerjema
- [x] ~65 zaslonov (advisor, mehanik, skladišče, lastnik, portal, print); PWA manifest + ikone
- [x] Demo mode (Vercel) s polnim demo store-om; 16 spec testov v shared jedru (denar, DDV, audit, sekvence)
- [x] 0 TODO/FIXME v kodi

## 🔧 Manjka do code-complete (po sprintih)

### Sprint 1 — Infrastrukturna predpogoja + quick wins
- [x] **Mailer adapter** (port `notification.port.ts` obstaja, samo stub): SMTP/Resend adapter, config-driven, + predloge (verifikacija, dobrodošlica, trial opomnik, dunning). Brez živih ključev = honest no-op z logom.
- [x] **Outbox worker**: interval zanka (FOR UPDATE SKIP LOCKED claim → dispatch na registrirane OutboxHandler-je → done/retry z backoff). Brez tega Minimax/e-invoice eventi večno čakajo.
- [x] **Scheduler primitiv**: worker zanka pokriva outbox retry + reaper; trial-expiry job pride s Fazo A (stolpec `trial_ends_at` še ne obstaja).
- [x] Quick-win ungates: WO → "Ustvari predračun" gumb (stale gate — estimates so realni!); warehouse ai-import (OcrModule obstaja — preveri wiring).

### Sprint 2 — Faza A: self-serve signup & provisioning
- [ ] Migracija 0018: `app.user_credentials` (argon2id), `app.signup_tokens`, `tenants.plan/billing_status/trial_ends_at`
- [ ] `/public/signup` modul: registracija, e-mail verifikacija (prek Sprint-1 mailerja), rate limit + Turnstile hook, enumeration zaščita
- [ ] Provisioning transakcija: tenant + owner + defaults + audit `tenant.created`; opcijski demo seed (idempotenten, prek REST)
- [ ] Web: /signup, /verify, onboarding checklist kartica (4 koraki), VIES lookup za tenant podatke
- [ ] Lastna prijava (email+geslo) ob obstoječem dev-auth/OIDC

### Sprint 3 — Feature-complete blok (luknje iz avdita)
- [ ] **Notifications backend** (`/notifications` list/markRead/markAllRead — web kontrakt obstaja, controllerja NI; zvonček v advisor layoutu je v real mode disabled): tabela + pisanje ob ključnih dogodkih + ungate layouta
- [ ] **Presets backend** (`/presets` CRUD — paketi storitev; demo kontrakt obstaja, backenda NI) + ungate 3 strani
- [ ] **Items CRUD dopolnitev**: PATCH /inventory/items/:id + GET detail (POST/GET/receive/transfer že obstajajo) + ungate items strani
- [ ] **GDPR export** `/export/snapshot` backend (web kliče, backenda NI) + ungate owner/data — DPA obljuba!
- [ ] **CSV uvozi** (owner/imports demo-only → real: stranke + artikli, strict validacija, dry-run pregled) — ključna migracija z legacy programov
- [ ] MinimaxSyncPanel na real outbox status (po Sprint 1 workerju)

### Sprint 4 — Faza B: entitlements & billing
- [ ] PlanGuard + `@RequiresPlan` po modulih; soft paywall (read-only + 402 na mutacije; izvoz VEDNO odprt)
- [ ] Stripe Checkout/Portal/webhooki (test-mode = koda; live ključi = ops)
- [ ] Platform-tenant fakturiranje: `invoice.paid` → `issueFromLines` (naš legalni SI račun, gapless, Minimax)

### Sprint 5 — Javna lupina + distribucija
- [ ] Landing + /pricing + pravne strani (Pogoji, Zasebnost, DPA) — root page.tsx je danes demo vstop
- [ ] e-SLOG lokalna XSD/Schematron validacija ob izvozu (oddaja prek ponudnika = ops)
- [ ] Capacitor skeleton: cap init iOS/Android, camera/push/biometric plugini, build config (store submission = ops)

### Priporočeno (ni blocker)
- [ ] API smoke testi za money path (nalog → račun → plačilo → dobropis)
- [ ] HR lokalizacija temelj (i18n okvir) — Fiskalizacija 2.0 odpira trg 2026

**Code-complete = vsi checkboxi Sprint 1–5.** Ocena: 5 fokusiranih sprintov po ustaljenem ritmu (1 sprint ≈ 1–2 najini seji).
