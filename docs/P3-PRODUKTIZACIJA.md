# P3 — Produktizacija: od interne platforme do self-serve SaaS

> **Status:** odločitveni dokument (sprejet pred implementacijo) · **Datum:** 10. 6. 2026
> **Področje:** tenant signup, billing, EU hosting/skladnost, Capacitor mobilni ovoj
> **Metoda:** analiza → raziskava trga → primerjava alternativ → priporočilo (raziskava opravljena 10. 6. 2026, viri na dnu)

---

## 0. Povzetek odločitev (TL;DR)

| Odločitev | Priporočilo | Zakaj na kratko |
|---|---|---|
| Cenovni model | 3 paketi, **flat na delavnico** (ne per-user): 49 / 119 / 249 €/mes + DDV, letno −20 % | SI trg je cenovno občutljiv; per-user kaznuje rast ekipe, kar je proti našemu interesu |
| Trial | **14 dni, brez kartice**, s seed demo podatki | Najnižja vstopna ovira; aktivacija pred plačilom |
| Billing | **Stripe Billing + Stripe Tax** (ne Paddle MoR) | ~3× nižji stroški v EU; Paddle lock-in; naš lasten invoice engine pokrije ZIERDED |
| SaaS računi tenant-om | **Lasten invoice engine** ("platform tenant") izdaja legalne SI račune; Stripe je samo plačilni kanal | ZIERDED: od 1. 1. 2028 morajo biti naši B2B računi SI strankam e-SLOG prek registriranega ponudnika — to že znamo |
| Auth za self-serve | **Lastna lightweight auth** (email + geslo + verifikacija, argon2id) na obstoječi JWT infri | Nič zunanjih odvisnosti, EU rezidenca trivialna, OIDC/SSO ostane za enterprise pot |
| Hosting | **Hetzner (Falkenstein/Nürnberg)** Docker compose za API + Postgres; web ostane Vercel (region fra1) | EU rezidenca, predvidljivi stroški (~20–40 €/mes do prvih deset tenantov), brez vendor lock-ina |
| Mobilno | **Capacitor** ovoj (potrjeno že prej; tu: izvedbeni načrt + Apple 4.2 mitigacije) | Kamera (tablice), push, biometrija = prava nativna vrednost, ne "wrapped website" |
| Vrstni red | **Faza A: signup + provisioning → B: entitlements + Stripe → C: hosting selitev → D: Capacitor** | A je predpogoj za vse; D je neodvisen in lahko teče vzporedno s C |

---

## 1. Kaj "produktizacija" pomeni za ta projekt

Danes: ena platforma, en operativni najemnik (A-SPRINT d.o.o.), tenant se ustvari ročno (migracije + seed). Multi-tenant temelji **že obstajajo in so trdni**: `tenant_id` na vsaki tabeli, vsiljen RLS (`FORCE ROW LEVEL SECURITY` povsod), gapless števci po tenantu, audit veriga po tenantu, RBAC matrika v `@workshop/shared`.

Produktizacija = štiri manjkajoče plasti **okoli** obstoječega jedra (jedra se skoraj ne dotikamo):

1. **Samopostrežni vstop** — obiskovalec → delavnica v < 5 min, brez človeka v zanki.
2. **Denarni tok** — trial → naročnina → entitlement (kaj tenant sme) → naš račun tenant-u.
3. **Produkcijska infrastruktura v EU** — API + baza z backupi, monitoringom, DPA-ji.
4. **Distribucija** — PWA danes, Capacitor v trgovinah (kamera za tablice, push za stranke).

Načelo ostaja isto kot doslej: **nič vzporednih izumov**. Signup uporabi obstoječi VIES lookup. Billing računi gredo skozi obstoječi invoice engine. Entitlement je en stolpec + en guard, ne nov sistem.

---

## 2. Trg in konkurenca

### 2.1 Ameriški referenčni igralci (heavy-duty / general repair)

| Igralec | Fokus | Cena (javni viri, jun 2026) | Opombe |
|---|---|---|---|
| **Fullbay** | heavy-duty truck & trailer (naš najbližji funkcionalni sorodnik) | uradno "pokliči za ceno", letna pogodba; neodvisni viri: Basic ~188 $/mes + ~89 $/dodatnega uporabnika | Standard kategorije za tovorne delavnice v ZDA; brez EU lokalizacije, brez e-SLOG, brez SI DDV logike |
| **Shopmonkey** | general repair, ima heavy-duty paket | od 179 $/mes (letno) oz. ~199 $/mes | Moderna UX referenca; per-location flat |
| **AutoLeap** | general repair | ~199 $/mes | Visoke ocene podpore |
| **Tekmetric** | general repair | javno ne objavlja podrobno | Močan v ZDA, ni EU |
| **Orderry** | servisne delavnice splošno | ~69 $/mes | Cenovni spodnji rob kategorije |

**Sklep:** globalna kategorija "shop management SaaS" se prodaja **flat na lokacijo, 100–250 $/mes**, z letnimi pogodbami. Nihče od njih ne pokrije slovenske davčne realnosti (gapless številčenje, e-SLOG, Minimax, FURS svet) — to ni njihov trg in nikoli ne bo prioriteta.

### 2.2 Slovenski obstoječi ponudniki

Raziskava ("program za avtoservis"): ponudba so **desktop-era programi** (Hisoft od 1995, ININ, HisoftPlus ipd.) — delovni nalogi, zaloga, blagajna, davčno potrjevanje; tipičen UX je "tipka F4 odpre formular". Cene se začnejo okrog **30 €/mes brez DDV**. Nič od tega ni: cloud-native multi-tenant, AI (glas → nalog, OCR prevzem, tablice), mobile-first za mehanika, portal za stranko, flotni pogled.

### 2.3 Naš moat in pozicioniranje

1. **Regulatorni moat — ZIERDED.** Državni zbor je 23. 10. 2025 sprejel ZIERDED: **od 1. 1. 2028 je izmenjava e-računov med slovenskimi poslovnimi subjekti obvezna**, izključno strukturirani e-SLOG 2.0 / EN 16931, **samo prek registriranih ponudnikov e-poti / Peppol / UJP** — e-pošta in PDF ne štejeta. Vsaka delavnica, ki fakturira podjetjem (flote, prevozniki, leasing — tj. *naša* ciljna stranka), bo do 2028 *morala* imeti to, kar mi že imamo vgrajeno (e-SLOG engine + outbox). Legacy desktop programi bodo to dograjevali pod prisilo; mi to prodajamo kot temelj. **Marketinška poanta: "2028-ready danes."**
2. **AI-native za tovorni segment.** Fullbay-jeva globina (servisni nalogi, flote, fakturiranje flot) + AI sloji, ki jih nihče lokalno nima (glasovni nalogi, OCR prevzem, prepoznava tablic, AI manager) + slovenska davčna pravilnost kot prvorazredna funkcija.
3. **Cenovno sidro:** med legacy 30 € in ameriškimi ~180 $. Spodnji paket mora pobrati legacy migrante, zgornji mora biti še vedno očitno cenejši od "Fullbay-class" vrednosti.

---

## 3. Cenovni model (predlog)

| | **Start** 49 €/mes | **Delavnica** 119 €/mes | **Flota** 249 €/mes |
|---|---|---|---|
| Uporabniki | do 3 | do 10 | neomejeno |
| Delovni nalogi, stranke, vozila, predračuni, koledar | ✓ | ✓ | ✓ |
| Računi + e-SLOG izvoz, gapless številčenje | ✓ | ✓ | ✓ |
| Skladišče (prevzemi, naročila, inventura) | — | ✓ | ✓ |
| AI: glasovni nalogi, OCR prevzem, tablice | — | ✓ | ✓ |
| Minimax sinhronizacija, portal za stranke | — | ✓ | ✓ |
| Najem vozil, flotni pogled, potni nalogi, evidenca ur | — | — | ✓ |
| SMS paket | — | 100/mes | 500/mes |

Pravila: cene **brez DDV**, letno plačilo −20 %, trial 14 dni brez kartice (po izteku: read-only "soft paywall", podatki se ne brišejo 90 dni). Per-user *ne* — hočemo, da delavnica doda vse mehanike, ker vsak mehanik na tablici = globlji lock-in. Limit uporabnikov po paketu je dovolj za up-sell. Anchor tenant A-SPRINT dobi interni "founders" plan (Flota, 0 €) — ostane živi laboratorij.

Preprost izračun praga preživetja: 25 tenantov × povpr. 110 €/mes ≈ 2.750 €/mes MRR → pokrije infrastrukturo (≈ 50 €), billing provizije (≈ 60 €) in resen del razvoja. 100 tenantov ≈ 11.000 €/mes MRR. Slovenija ima ~1.000+ registriranih avtoservisnih subjektov s tovornim programom + HR/AT sosednji trg z istim Peppol/EN16931 svetom — TAM je realen za prvih 100.

---

## 4. Billing arhitektura

### 4.1 Primerjava

| | **Stripe Billing (+ Tax)** | **Paddle (MoR)** | **Lasten engine + SEPA/UPN** |
|---|---|---|---|
| Provizija (EU kartica) | 1,5 % + 0,25 € + Billing ~0,7 % (+ Tax dodatek) | 5 % + 0,50 $ (+ ~1 % FX) | ~0 € (bančni stroški), ampak ročna izterjava |
| Kdo je prodajalec | **mi** (A-SPRINT GARAGE entiteta) | Paddle (UK/IE) | mi |
| DDV obračun | Stripe Tax izračuna; **mi prijavljamo** (SI 22 %, EU B2B reverse charge ob validiranem VAT — VIES kodo že imamo!) | Paddle vse prevzame | mi (računovodja, kot doslej) |
| ZIERDED 2028 (naši računi SI tenant-om) | **Mi izdamo e-SLOG iz lastnega engina** — Stripe je samo plačilo | Čezmejna transakcija (Paddle ni SI subjekt) → formalno izven SI B2B obveze, ampak SI s.p.-ji sovražijo tuje reverse-charge račune | Nativno ✓ |
| Dunning / neuspela plačila | vgrajen Smart Retries | vgrajeno | ročno |
| Lock-in / izstop | nizek (kartični podatki prenosljivi po PCI procesu) | **visok** — javno dokumentirane boleče migracije | ni |
| Ekonomika @ 50 tenantov × 110 € (5.500 €/mes) | ≈ **135–160 €/mes** | ≈ **330–390 €/mes** | ≈ 0 € + tvoj čas |

### 4.2 Priporočilo

**Stripe Billing + Stripe Tax**, s **hibridom za fakture**:

1. Stripe vodi: subscription objekt, kartico, poskuse bremenitve, proration, dunning. Naš API posluša webhooke (`customer.subscription.updated`, `invoice.paid`, `invoice.payment_failed`) in vzdržuje **entitlement** na tenant-u.
2. **Legalni račun tenant-u izda naš lasten invoice engine** — uvedemo "platform tenant" (A-SPRINT GARAGE d.o.o. kot najemnik #0), `invoice.paid` webhook sproži `issueFromLines` z eno postavko ("Naročnina Delavnica, junij 2026") → gapless SI številka, pravilen DDV (22 % SI / reverse charge EU z VIES validacijo), Minimax sync, in **od 2028 e-SLOG oddaja prek registriranega ponudnika** — vse po poteh, ki že obstajajo. Stripe-ov "invoice" PDF degradiramo v "potrdilo o plačilu".
3. **SEPA direct debit / UPN nakazilo kot druga možnost** za konservativne delavnice (Stripe podpira SEPA DD; UPN z ročno označitvijo plačila za letne pakete) — v SI B2B je "plačam po predračunu" še vedno kulturna realnost. Engine za predračune smo pravkar zgradili — uporabimo ga tudi zase.

Razlogi proti Paddle kljub mamljivi "vse-vključeno" zgodbi: pri naših volumnih je ~3× dražji, javno dokumentiran je težak izstop, in — ironično — *otežuje* ZIERDED zgodbo (naš najmočnejši prodajni argument je, da svoje lastne račune izdajamo po istem zakonu, ki ga prodajamo strankam; "dogfooding" je tu marketing).

### 4.3 Podatkovni model (skica migracije, faza B)

```sql
ALTER TABLE app.tenants ADD COLUMN plan text NOT NULL DEFAULT 'trial'
  CHECK (plan IN ('trial','start','delavnica','flota','founders'));
ALTER TABLE app.tenants ADD COLUMN billing_status text NOT NULL DEFAULT 'trialing'
  CHECK (billing_status IN ('trialing','active','past_due','suspended','cancelled'));
ALTER TABLE app.tenants ADD COLUMN trial_ends_at timestamptz;
ALTER TABLE app.tenants ADD COLUMN stripe_customer_id text;
ALTER TABLE app.tenants ADD COLUMN stripe_subscription_id text;
```

Entitlement guard: en NestJS guard (`PlanGuard`) + dekorator `@RequiresPlan('delavnica')` na modulih (skladišče, AI, najem). `past_due` → banner + 7 dni milosti; `suspended` → read-only (GET-i delujejo, mutacije 402). **Podatki se nikoli ne zaklenejo pred izvozom** — GDPR izvoz (`/export/snapshot`) ostane dostopen tudi suspendiranim. To je etična in prodajna točka.

---

## 5. Avtentikacija za self-serve

| | **Lastna (email+geslo)** | Keycloak (self-host) | Clerk / Logto cloud |
|---|---|---|---|
| EU rezidenca | trivialna (naša baza) | ✓ (naš strežnik) | odvisna od ponudnika/regije, dodatna DPA |
| Stroški | 0 € | ~en CX vozliček + vzdrževanje | od ~25 $+/mes, raste z MAU |
| Integracija z obstoječim | **JWT/OIDC infra že obstaja**; dodamo password kredencial | nova komponenta, OIDC flow imamo | nova odvisnost, vendor risk |
| SSO za enterprise kasneje | dodamo OIDC federacijo takrat | nativno | nativno |

**Priporočilo: lastna.** Konkretno: `app.user_credentials` (argon2id hash, per-user salt), `POST /public/signup`, email verifikacija s podpisanim tokenom (24 h), magic-link kot password-reset pot, rate limiting + Cloudflare Turnstile na javnih endpointih, session/refresh logika ostane obstoječa. Keycloak bi bil upravičen šele pri SSO zahtevah prvega enterprise kupca — takrat ga dodamo *zraven*, ne namesto.

---

## 6. Signup & onboarding (< 5 minut, izmerjeno)

**Tok (3 zasloni):**

1. **/signup** — email, geslo, ime delavnice. (Turnstile v ozadju.) → mail z verifikacijsko povezavo.
2. **Verifikacija → /onboarding** — "Davčna številka?" → **obstoječi VIES/AJPES lookup avtomatsko izpolni** naziv, naslov, pošto (isti `lookupCompany`, ki smo ga zgradili za stranke — zdaj onboarda *tenant-e*). Izbira: "Začni s preizkusnimi podatki" (seed: 3 stranke, 2 vozili, 1 odprt nalog, 5 artiklov) ali "Začni prazno".
3. **/advisor z onboarding checklistom** (vztrajna kartica): povabi mehanika → dodaj prvo stranko (ali VIES) → ustvari prvi nalog → izdaj prvi račun. Vsaka kljukica je aha-moment; checklist izgine ob 4/4.

**Provisioning (ena transakcija, `POST /public/signup/complete`):**
`INSERT app.tenants` (country='SI', plan='trial', trial_ends_at=now()+14d) → `INSERT app.users` (owner) + credentials → privzete nastavitve (DDV 22 %, plačilni rok 30 d, valuta EUR) → audit `tenant.created` (prvi člen nove verige) → izdaja sej. Števci so lazy (counter.next ob prvi rabi) — nič za seedat. Opcijski demo seed je idempotenten skript nad istimi REST potmi (dogfooding API-ja).

**Varnostne podrobnosti:** signup endpointi živijo IZVEN tenant middleware-a (`/public/*`), e-mail enumeration zaščita (vedno isti odgovor), verifikacijski tokeni enkratni, geslo min 10 znakov + zxcvbn ocena, vse na audit verigi platform tenanta.

---

## 7. EU hosting in skladnost

**Stanje:** web na Vercelu (OK — statika/SSR, region funkcij nastavimo na `fra1`), API + Postgres pa potrebujeta pravi runtime (NestJS dolgo-živeči procesi, outbox worker, jutri cron za trial poteke).

| | **Hetzner Cloud (DE/FI)** | Fly.io (fra) | Railway/Render (EU) | Managed PG (Neon/Supabase, Frankfurt) |
|---|---|---|---|---|
| Rezidenca | EU (DE) ✓ | EU region ✓ (US podjetje) | EU region ✓ (US podjetji) | EU region ✓ (US podjetji) |
| Cena za naš začetek | **~20–40 €/mes skupaj** (CPX31-class VM + storage box za backupe) | ~30–60 $ | ~40–80 $ | +20–70 $ samo baza |
| Ops breme | Docker compose + Caddy + wal-g; znamo | nizko | najnižje | najnižje (baza) |
| Izstop / lock-in | nič (gole VM) | nizek | srednji | srednji |

**Priporočilo po fazah:** Faza C-1: **Hetzner, 2 VM-ja** (app: API+Caddy; db: Postgres 16 + wal-g PITR backupi na Hetzner Object Storage, dnevni restore-test skript), Uptime Kuma + healthcheck endpoint (že obstaja). Faza C-2 (ob >25 tenantih): drugi app VM + LB, ali selitev baze na managed EU PG, če ops postane drag. GDPR paket: DPA s Hetznerjem/Verclom, evidenca podizvajalcev na spletni strani, naša Pogodba o obdelavi za tenant-e (delavnica je upravljavec podatkov svojih strank, mi obdelovalec — standardni SaaS DPA), izvoz (`/export/snapshot` že obstaja) + izbris s 30-dnevnim rokom.

---

## 8. Capacitor (mobilni ovoj)

**Zakaj zdaj smiselno:** PWA že pokrije 80 %; Capacitor doda native kamero (prepoznava tablic in OCR dobavnic — naša dva najmočnejša "wow" momenta sta kamerna!), push (status servisa stranki, naloga mehaniku), biometrijo (Face ID prijava mehanika ob 6h zjutraj z umazanimi rokami) in prisotnost v trgovinah (kredibilnost pri večjih flotah).

**Apple guideline 4.2 ("minimum functionality") tveganje:** Apple zavrača "spletno stran v ovoju". Mitigacije, ki jih dejansko vgradimo (in v review notes eksplicitno naštejemo): @capacitor/camera (tablice/OCR), @capacitor/push-notifications, biometric auth plugin, offline splash + cache shell, native share. To ni kozmetika — to so funkcije, ki jih PWA na iOS ne dobi (push na iOS PWA je še vedno okrnjen). Realna ocena: prva oddaja ima ~30 % možnost zavrnitve s 4.2; z naštetimi plugini in review-notes pojasnilom je odobritev norma v 1–2 iteracijah.

**Stroški/koraki:** Apple Developer 99 $/leto + Google Play 25 $ enkratno; `npx cap add ios android`, app ikone/splash (generate-icons.mjs že obstaja!), TestFlight interni → A-SPRINT mehaniki kot beta, store listing v SL+EN. Ocena: 1 sprint za prvo TestFlight verzijo, ker je web že mobile-first.

---

## 9. Načrt izvedbe

| Faza | Obseg | Predpogoj | Definition of Done |
|---|---|---|---|
| **A — Signup & provisioning** (prvi sprint) | `/public/signup` + verifikacija + provisioning transakcija + onboarding checklist + lastna auth (argon2id) + Turnstile + migracija (credentials, tenants stolpci plan/trial) | nič — začnemo takoj | nov obiskovalec pride do izdanega prvega računa v < 5 min brez naše pomoči, na pravem stacku; audit veriga novega tenanta se začne s `tenant.created` |
| **B — Entitlements & Stripe** | PlanGuard + paketi + Stripe Checkout/Portal + webhooki + platform-tenant fakturiranje prek `issueFromLines` | A | trial poteče → soft paywall; plačilo → `active` + naš SI račun z gapless številko v Minimax outboxu; `past_due` dunning deluje |
| **C — Hosting selitev** | Hetzner VM-ja, Docker compose, wal-g PITR, monitoring, DPA paket | A (B zaželeno) | produkcijski API/DB v EU z dokazanim restore-testom; demo Vercel ostane marketing |
| **D — Capacitor** | iOS+Android ovoj, kamera/push/biometrija plugini, TestFlight | nič (vzporedno) | A-SPRINT mehanik uporablja TestFlight build cel delovni dan brez odprtja brskalnika |

**Zavestno odloženo:** AJPES/Bizi (čaka credentials), per-tenant custom domene, marketplace integracij, večjezičnost UI (HR je prvi kandidat — Fiskalizacija 2.0 od 2026 dela enak regulatorni pritisk kot ZIERDED pri nas).

---

## 10. Tveganja

1. **Stripe Tax + SI specifike** — Tax ceno in obnašanje za SI→SI B2B preveriti ob implementaciji na test računu (faza B, dan 1).
2. **ZIERDED podzakonski akti** — registrirani ponudniki e-poti in tehnične podrobnosti pridejo z uredbami; spremljamo UJP listo; naš engine je standardno e-SLOG 2.0 / EN 16931, kar je eksplicitno zakonski standard.
3. **Apple 4.2** — opisano zgoraj; plan B je Android-first lansiranje (Play je permisiven), iOS iteriramo.
4. **Cene konkurence so iz neodvisnih virov** (Fullbay/Shopmonkey ne objavljata vsega) — pred javno cenovno stranjo naredimo še en sweep.
5. **Solo-founder ops** — Hetzner pomeni, da smo sami pager; mitigacija: Uptime Kuma + restore-test cron + dokumentiran runbook (vzorec že obstaja: docs/RUNBOOK-faza0-1.md).

## 11. Viri (10. 6. 2026)

ZIERDED: epos.si (DZ sprejel 23. 10. 2025, obveznost 1. 1. 2028), mladipodjetnik.si, forbes.n1info.si, bizbox.eu, sbc.si · Fullbay: fullbay.com/pricing (custom), itqlick.com (~188 $ + 89 $/user), capterra.com ($188 flat) · Shopmonkey: shopmonkey.io/pricing (od 179 $), capterra.com (199 $) · AutoLeap/Orderry: capterra alternatives ($199/$69) · Stripe: checkoutpage.com, globalfeecalculator.com (EU 1,5 % + 0,25 €; Billing ~+0,7 %; intl +1,5 %; FX +1 %) · Paddle: g2.com, dodopayments.com, saassoftwaretools.com (5 % + 0,50 $; FX ~1 %; lock-in poročila) · SI trg: omisli.si (od 30 €/mes), hisoft.si, inin.si · Cene tretjih virov označene kot neuradne.
