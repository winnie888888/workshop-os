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

### Delovni nalog 2.0 — urgentni feedback iz delavnice (10. 6. 2026)
- [x] **Tiskani A4 nalog** `/print/work-order/[id]` po papirnem obrazcu »Delovni nalog MEHANIČNI«: glava podjetja + logo, stranka, vozilo (znamka/reg/VIN/km), opis napake + diagnoza, mehanska dela, izvajalci z urami (Datum/Izvajalec/Od–do/Ure + skupaj), material s šifro, vsote, podpisa, noga z davčno; gumb »Natisni / PDF« na nalogu (app UI ostaja moderen — papir je samo izpis)
- [x] **Več mehanikov na nalogu**: sekcija »Mehaniki in ure« (vnosi + seštevek po mehaniku + skupaj — Janez 1.5 h + Marko 0.5 h = 2 h) ter ročni vnos ur (`POST /work-orders/:id/time`, mehanik/datum/ure, audit); mehanikov clock-on/off nedotaknjen
- [x] **Statusi v UI**: gumba »Čaka dele« in »Čaka stranko« + »Deli prispeli → nadaljuj« (stanja so v state machine obstajala, manjkali so gumbi)
- [x] **Vrstica postavke**: izrazit gumb »✓ Shrani« (prejšnji »dodaj« je bil na telefonu odrezan), Enter shrani, po shranjeni vrstici vnos teče naprej (zaporedni vnos)
- [x] **Material: šifra** (sku iz zaloge) v nalog payloadu in na izpisu
- [x] **Logo na izpisih**: nalog + račun + predračun (interim: prikaz za sidrnega najemnika; per-tenant nalaganje loga = backlog). Minimaxov PDF računa se ureja v Minimaxu (Nastavitve → Izpisi), ne pri nas
- [x] **Nadzorna plošča**: velika gumba »+ Nov nalog« in »Pregled nalogov« na vrhu; kartica »Prvi koraki« dobila »Skrij ✕« (trajno, localStorage)
- [x] Iskanje po registrski/VIN/št. naloga: obstoječi globalni search to že pokriva (potrjeno v kodi)

- [x] **Priloge na nalogu** (blok 2): sekcija na nalogu — foto gumbi »📷 Poškodba / Števec km / VIN« (kamera telefona, oznaka v imenu datoteke; ključno za reklamacije) + »📎 Priloži PDF/dokument« (homologacija, prometno, dobavnica); obstoječi presign→PUT→complete tok, nov `uploadWorkOrderDocument` (OCR-jev `uploadDocument` brez naloga nedotaknjen); klik na prilogo odpre datoteko
- [x] **Zgodovina vozila**: nova stran vozila `/advisor/vehicles/[id]` (klik iz seznama vozil/stranke/plate-scan zdaj vodi sem, Uredi gumb ostaja): čipi Zadnji servis / Menjava olja / Zavore (pošteno označeno kot hevristika po opisih postavk) + pretekli nalogi in računi s povezavami; API `GET /assets/:id/history`
- [x] **Marža na materialu**: izbirnik delov na nalogu zdaj pod prodajno ceno pokaže nabavno (cost_minor je v shemi že obstajal) in maržo v % — svetovalec vidi zaslužek pred dodajanjem

**Preostali backlog:** dobavitelj na artiklu (zahteva migracijo — informacija o dobavitelju danes živi na nabavnih naročilih); per-tenant logo upload v Nastavitvah; statusna postavka na posameznem delu naloga.

### Računi 1:1 z Minimaxom — urgentni feedback (10. 6. 2026 zvečer)
- [x] **Tiskani račun = Minimax predloga**: glava z VSEMI podatki podjetja (naziv, naslov, Identifikacijska številka, Tel/Faks/E-pošta/splet + logo) in OBA TRR z BIC desno; blok RAČUN (Številka, Kraj, Referenca, Datum, Opravljeno, Zapade, Osnova za račun); tabela Vrsta blaga oz.storitev / Količina / Cena / DDV / Cena z DDV / Vrednost EUR; vsote SKUPAJ → DDV % od osnove → SKUPAJ EUR → Za plačilo EUR; PODPIS. Referenca = RF (ISO 11649 s kontrolo — bančno enakovredna SI00, uvoz izpiskov jo ujame 100 %)
- [x] **UPN QR na tiskanem računu** (isti ZBS standard kot na zaslonu) — pogoj: IBAN v profilu + izdan račun + odprt saldo; ob QR sklic in navodilo
- [x] **Pravna klavzula na VSAKEM računu** (3 odstavki: ne-vračanje vgrajenih delov; pregled ob prevzemu in reklamacije; pridržek lastninske pravice + zamudne obresti/izterjava) — droben tisk nad nogo
- [x] **Registracijska noga družbe** (sodišče, št. vpisa, osnovni kapital, matična, IBAN/SWIFT) — prosto besedilo iz Nastavitev, izpis na dnu računa
- [x] **Profil podjetja razširjen** (migracija 0023 + Nastavitve → »Podatki podjetja in plačil«): telefon, faks, e-pošta, splet, BIC, drugi IBAN + BIC2, registracijska noga — vpiše se ENKRAT, velja za vse dokumente
- [x] **Država pri stranki → predpona ID za DDV**: izbira države v formi stranke samodejno nastavi/zamenja predpono (SI/DE/IT/AT/HR …); ob shranjevanju se manjkajoča predpona doda sama (nova + uredi forma)
- [ ] Po istem vzoru posodobiti še tiskani PREDRAČUN (print/quote) na Minimax obliko

### Sprint 6 — Plačila P2: uvoz bančnih izpiskov ✓ KONČAN (10. 6. 2026)
- [x] **camt.053 parser** (lasten, brez odvisnosti; selftest na realističnem izpisku ALL PASS): IBAN računa, obdobje, Ntry → znesek/valuta/datum/plačnik/IBAN/sklic (CdtrRefInf + fallback iz Ustrd z mejami besed); prstni odtis = AcctSvcrRef / EndToEndId / hash. POŠTENO: ozek ISO 20022 bralnik za zapiranje računov, ne polna implementacija standarda
- [x] **Ujemanje po sklicu**: RF validiran po ISO 11649 (mod-97) → točno en odprt račun = samodejni predizbor; SI sklic po vsebovani številki; brez sklica = predlogi po točnem odprtem saldu (NIKOLI samodejno); odlivi in že knjiženi prilivi označeni
- [x] **Idempotentna knjižba**: UNIQUE (tenant, fingerprint); vrstica 'pending' PRED knjižbo → 'applied' PO njej; ponovni uvoz istega izpiska ne podvoji ničesar, prekinjen poskus se varno dokonča; migracija 0022 (bank_imports + bank_import_entries, RLS)
- [x] **Knjiženje skozi invoices domeno**: nova `applyPaymentToInvoice` (ciljno na račun iz sklica; payments + allocations + repo.applyPayment + audit `payment.recorded` s source='bank_import'; preplačilo ostane vidno kot unapplied) — ena resnica o saldu/statusu računa
- [x] **Zaslon Plačila (banka)** (advisor NAV): uvoz .xml → predogled ujemanj (nič se ne knjiži) → izbor → »Knjiži izbrana plačila (N)« → rezultat s povezavami; main.ts json limit 10mb za večje izpiske
- [ ] Naprej (P2.1): zgodovina uvozov na zaslonu; ročno »razknjiži« plačilo; samodejno obvestilo stranki »plačilo prejeto«

**Code-complete = vsi checkboxi Sprint 1–5: DOSEŽENO (10. 6. 2026)** — edina odprta podpostavka je platform-fakturni handler (gl. Sprint 4), zavestno vezan na Stripe test ključe. Naprej: Plačila P2 (camt.053, Sprint 6) in P3 (Stripe Connect + blagajna, Sprint 7).
