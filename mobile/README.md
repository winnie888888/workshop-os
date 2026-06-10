# A-SPRINT GARAGE — mobilna lupina (Capacitor)

Skeleton iz Sprinta 5. Spletna aplikacija (Next.js, SSR) ostaja edini vir
resnice; Capacitor jo zavije v nativno iOS/Android lupino (remote-URL
strategija) — en deploy posodobi splet in obe aplikaciji.

## Prvi zagon (na razvojnem računalniku)
```
cd mobile
pnpm install
pnpm add:android        # in/ali: pnpm add:ios (zahteva macOS + Xcode)
pnpm sync
pnpm open:android       # odpre Android Studio → Run
```

## Razvoj proti lokalnemu API/web
V `capacitor.config.ts` začasno nastavi:
`server: { url: 'http://<IP-tvojega-PC>:3001', cleartext: true }`
(telefon in PC na istem omrežju). Pred oddajo v trgovino VRNI produkcijski
https URL in `cleartext: false`.

## Vključeni plugini
- `@capacitor/camera` — fotografiranje dobavnic (OCR prevzem) in tablic
- `@capacitor/push-notifications` — obvestila (zvonček → push; FCM/APNs ključi = ops)
- `@capacitor/preferences` — varna shramba seje
- `@capacitor/app` — življenjski cikel, globi gumb nazaj

Biometrija (odklep s prstom/obrazom): priporočen community plugin
`capacitor-native-biometric` — dodaj ga ob implementaciji odklepa seje.

## Kaj je še OPS (ni koda)
- ikone + splash (`@capacitor/assets` iz enega 1024px logotipa)
- podpisni ključi (Android keystore, Apple certifikati/profili)
- FCM/APNs konfiguracija za push
- vnosi v Play Console / App Store Connect + pregledi
