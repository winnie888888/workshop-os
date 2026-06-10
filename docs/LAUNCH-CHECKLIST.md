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

### Sprint 2 — Faza A: self-serve signup & provisioning ✓ KONČAN
- [x] Migracija 0018: `app.user_credentials`, `app.signup_tokens`, `tenants.plan/billing_status/trial_ends_at` (KDF: Node scrypt namesto argon2id — brez native odvisnosti; parametri v hashu, migracija na argon2id kadar koli čista)
- [x] `/public/signup|verify|login` modul: registracija, e-mail verifikacija (prek Sprint-1 mailerja), rate limit + Turnstile (config-driven), enumeration zaščita, lockout
- [x] Provisioning transakcija: tenant + owner + membership + credentials + audit `tenant.created` (prvi člen verige); demo seed → del web onboardinga (naslednji ship)
- [x] Web: /signup, /verify (Suspense + enkratni žeton), lokalna prijava na vstopni strani (OIDC ostaja kot SSO), onboarding kartica »Prvi koraki« — 4 koraki IZVEDENI iz dejanskih podatkov (stranka → nalog → predračun → termin) + seed prek pravih REST klicev; VIES za STRANKO je v koraku 1, VIES za podatke delavnice → nastavitve tenanta (Sprint 3/4)
- [x] Lastna prijava (email+geslo): lokalni HS256 žetoni skozi OBSTOJEČI TokenVerifier (`local|<userId>` ↔ external_subject); OIDC nedotaknjen

### Sprint 3 — Feature-complete blok (luknje iz avdita)
- [x] **Notifications backend**: migracija 0019 (per-prejemnik vrstice), `/notifications` list/read/read-all 1:1 z web kontraktom, globalni NotifyService (fan-out po vlogah prek withAdmin — memberships je admin-only); hooki: `invoice.issued` (×2, near-commit) + outbox dead-letter → sistemsko opozorilo ownerjem; zvonček ungated. WO-status hook → blok 2 (modul nima ene transition točke, ne vstavljam na slepo)
- [x] **Presets backend**: tabela + CRUD 1:1 z demo obliko (lines jsonb, vehicleClasses/powertrains), Permission.PresetManage (owner/admin/warehouse), audit preset.*; 3 strani ungated
- [x] **Items CRUD dopolnitev**: GET /inventory/items/:id + PATCH (COALESCE delni update, StockReceive permission); 3 items strani ungated (list klik-vrstica, new, detail/edit)
- [x] **GDPR export** `/export/snapshot`: poln posnetek (15 entitet, SELECT * = resnica sheme; postavke/DDV kot jsonb agregati; roster prek withAdmin), nova `Permission.DataExport` (owner+admin), avditiran dostop `export.snapshot`; owner/data ungated + dobavitelji v tabeli
- [x] **CSV uvozi v realnem načinu**: čarovnik ungatan; matching za dry-run iz API (stranke prek customers.list, artikli prek kataloga), zapis prek ISTIH REST poti kot ročni vnos (polna validacija+audit+RLS, sekvenčno z napredkom, napake po vrsticah v opombe); ISO-2 država + DDV prefiks fix; nepersistabilna polja pošteno javljena (stranke: email/tel; artikli: opis/EAN; zaloge → Prevzem); posodobitve strank preskočene do PATCH /customers; vozila/računi ostajajo predogled
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
