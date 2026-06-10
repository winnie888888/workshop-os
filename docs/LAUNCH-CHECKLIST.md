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

### Sprint 3 — Feature-complete blok (luknje iz avdita) ✓ KONČAN
- [x] **Notifications backend**: migracija 0019 (per-prejemnik vrstice), `/notifications` list/read/read-all 1:1 z web kontraktom, globalni NotifyService (fan-out po vlogah prek withAdmin — memberships je admin-only); hooki: `invoice.issued` (×2, near-commit) + outbox dead-letter → sistemsko opozorilo ownerjem; zvonček ungated. WO-status hook → blok 2 (modul nima ene transition točke, ne vstavljam na slepo)
- [x] **Presets backend**: tabela + CRUD 1:1 z demo obliko (lines jsonb, vehicleClasses/powertrains), Permission.PresetManage (owner/admin/warehouse), audit preset.*; 3 strani ungated
- [x] **Items CRUD dopolnitev**: GET /inventory/items/:id + PATCH (COALESCE delni update, StockReceive permission); 3 items strani ungated (list klik-vrstica, new, detail/edit)
- [x] **GDPR export** `/export/snapshot`: poln posnetek (15 entitet, SELECT * = resnica sheme; postavke/DDV kot jsonb agregati; roster prek withAdmin), nova `Permission.DataExport` (owner+admin), avditiran dostop `export.snapshot`; owner/data ungated + dobavitelji v tabeli
- [x] **CSV uvozi v realnem načinu**: čarovnik ungatan; matching za dry-run iz API (stranke prek customers.list, artikli prek kataloga), zapis prek ISTIH REST poti kot ročni vnos (polna validacija+audit+RLS, sekvenčno z napredkom, napake po vrsticah v opombe); ISO-2 država + DDV prefiks fix; nepersistabilna polja pošteno javljena (stranke: email/tel; artikli: opis/EAN; zaloge → Prevzem); posodobitve strank preskočene do PATCH /customers; vozila/računi ostajajo predogled
- [x] MinimaxSyncPanel → ŽIV outbox status: GET /invoices/:id/sync (minimax.* + einvoice.* vnosi, poll 5 s) + POST :id/sync/retry (dead→pending, avditirano `invoice.sync_retry`); »not configured« iz last_error → pošten namig na poverilnice; demo animacija ostane samo v demu

### Plačila P1 — UPN QR ✓ KONČAN (med Sprint 3 in 4)
- [x] **QR jedro, bit-točno po ZBS standardu**: vendoran Nayuki qrcodegen (MIT; edina knjižnica z ECI) + `lib/qr/upn.ts` — polja 1–20, kontrolna vsota, verzija 15 fiksno, ECC M (brez boosta), ECI 000004, ISO 8859-2; preverjeno proti 5 uradnim vsotam standarda (183/238/152/143/188) + RF check (`SBO2010`→`RF45SBO2010`); EPC069-12 QR za tuje banke/Revolut
- [x] **Migracija 0020 + `/tenant/profile`**: tenants += iban/bank_name/address/post_code/city; GET odprt vsem članom (QR riše tudi svetovalec), PATCH = nova owner/admin pravica `TenantManage`, avditirano `tenant.updated`; withAdmin vzorec (tenants brez grantov za workshop_app)
- [x] **Nastavitve → »Podatki za plačila (UPN QR)«**: strežniška kartica nad lokalno »Podjetje« sekcijo; 403 → pošteno sporočilo o vlogi; demo = vzorčni ZBS IBAN z oznako
- [x] **Račun**: PayQr kartica (UPN/SEPA zavihka, kopiraj IBAN/sklic/znesek) za izdane neplačane račune — znesek = preostanek (gross − plačano), sklic RF iz številke računa, rok = zapadlost, plačnik iz stranke; skrito za osnutke/dobropise/plačane
- [x] **Predračun**: avansni QR s kodo namena **ADVA** pri statusu poslan/sprejet (uradni vzorec primer B)
- [ ] P1.1: »Pokaži QR« za mehanika ob predaji (zahteva InvoiceRead za mehanika — produktna odločitev) + QR na portalu strank; lokalna »Podjetje« sekcija nastavitev → migracija na tenant profil
- [ ] Plačila P2 (Sprint 6): uvoz bančnih izpiskov camt.053 → samodejno zapiranje računov po RF sklicu; P3 (Sprint 7): Stripe Connect + modul davčne blagajne (glej docs/PLACILA-STRATEGIJA.md)

### Sprint 4 — Faza B: entitlements & billing
- [x] **PlanGuard (blok 1)**: globalni APP_GUARD — mehki paywall PO METODI (GET/HEAD/OPTIONS vedno prosti → branje in GDPR izvoz nikoli zaklenjena; mutacije ob trial_expired/suspended/cancelled → 402 s slovenskim problem+json); founders=vedno aktivno (A-SPRINT); past_due piše naprej (Stripe retry okno); /billing poti izvzete; 60 s cache stanja. Per-paket omejitve (start vs flota featuri) pridejo z entitlements ob Stripe paketih (blok 2) — globalni guard po metodi je temelj.
- [x] **Trial-expiry sweep**: 10-min interval v BillingSweepService — trialing+potekel → suspended, audit `tenant.trial_expired` (actor=sistem), obvestilo owner/admin prek zvončka; guard blokira tudi pred sweepom (computeState preverja trial_ends_at)
- [x] **GET /billing/status + pasica**: trial odštevanje / past_due opozorilo / zamrznitev z razlago v advisor+owner layoutu (demo skrito)
- [x] **Stripe Checkout/Portal/webhooki (blok 2)**: brez SDK (surovi fetch, vzorec Resend) — prazen STRIPE_SECRET_KEY ⇒ pošten 503; webhook varovan z verify-by-retrieve (event preberemo nazaj iz Stripe po id — brez raw-body posega); checkout/session.completed, subscription.updated/deleted, invoice.paid/payment_failed → plan/billing_status + audit `tenant.subscription_updated` + invalidate + zvonček; migracija 0021 (stripe_customer/subscription_id, unique parcialna indeksa); checkout zbira naslov + ID za DDV kupca (billing_address_collection, tax_id_collection) — podlaga za platformno fakturiranje
- [x] **Zaslon Zaračunavanje (owner/billing)**: stanje + 3 paketi (cene v lib/billing-plans.ts so PRIKAZNI predlog — vir resnice je Stripe Price; uskladi ob potrditvi cenika) + checkout/portal gumba + success/cancel povratek; pasica zdaj vodi sem (»Izberi paket →«); founders pošteno »naročnina ni potrebna«; NAV vnos
- [ ] Platform-tenant fakturiranje, KONČNI korak: handler, ki iz webhook audit zapisa (`invoice.paid` z zneski/obdobjem) prek `issueFromLines` izda NAŠ gapless SI račun → Minimax. Podatki kupca so po novem v Stripe (naslov + ID za DDV iz checkouta); manjka platform-tenant provisioning + handler (zavestno ločen ship — netestabilno brez Stripe ključev)

### Sprint 5 — Javna lupina + distribucija ✓ KONČAN
- [x] **Marketing**: /predstavitev (landing s hero, 6 funkcij, zaupanje, CTA) + /cenik (paketi iz skupne lib/billing-plans + FAQ) + skupna lupina (header/nav/footer). Root '/' namenoma OSTAJA vstop v aplikacijo (nič obstoječega ne zlomi, dodane diskretne povezave); ob go-live z domeno: 1-vrstični redirect '/'→'/predstavitev' v next.config (ops)
- [x] **Pravne strani**: /pravno/pogoji, /pravno/zasebnost (GDPR vloge, podlage, pravice), /pravno/dpa (čl. 28: navodila, podobdelovalci, varnost, kršitve, izbris, revizije) — VSE označene »Osnutek — pravni pregled pred produkcijo«
- [x] **e-SLOG predletna validacija**: strukturna EN 16931 kontrola ob izvozu (obvezni BT-ji, oblika ID za DDV/IBAN, BR-CO-10/15 računska konsistenca postavk in vsot) s potrditvenim oknom; POŠTENO: to ni polni XSD/Schematron — tisti teče pri registriranem ponudniku ob oddaji (ops, kot doslej)
- [x] **Capacitor skeleton** (mobile/): capacitor.config.ts (remote-URL strategija — en deploy posodobi splet+app), package.json (camera/push/preferences/app), README s točnimi koraki za add ios/android, dev proti lokalnemu IP in ops seznamom (ikone, podpisi, FCM/APNs, store vnosi); biometrija = priporočen plugin ob implementaciji odklepa

### Priporočeno (ni blocker)
- [ ] API smoke testi za money path (nalog → račun → plačilo → dobropis)
- [ ] HR lokalizacija temelj (i18n okvir) — Fiskalizacija 2.0 odpira trg 2026

**Code-complete = vsi checkboxi Sprint 1–5: DOSEŽENO (10. 6. 2026)** — edina odprta podpostavka je platform-fakturni handler (gl. Sprint 4), zavestno vezan na Stripe test ključe. Naprej: Plačila P2 (camt.053, Sprint 6) in P3 (Stripe Connect + blagajna, Sprint 7).
