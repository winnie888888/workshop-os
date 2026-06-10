import type { CapacitorConfig } from '@capacitor/cli';

/**
 * A-SPRINT GARAGE — Capacitor lupina (Sprint 5 skeleton).
 *
 * Strategija: REMOTE-URL wrapper. Next.js aplikacija teče na strežniku (SSR),
 * Capacitor pa jo zavije v nativno lupino za App Store / Google Play in doda
 * nativne zmožnosti (kamera za OCR prevzeme in tablice, push obvestila,
 * varna shramba seje). To pomeni: en deploy posodobi splet IN aplikaciji.
 *
 * Razvoj: server.url začasno preusmeri na http://<IP-razvojnega-računalnika>:3001
 * (cleartext:true spodaj to dovoli SAMO za razvoj — pred oddajo v trgovini
 * nastavi produkcijski https URL in cleartext odstrani).
 */
const config: CapacitorConfig = {
  appId: 'si.asprint.garage',
  appName: 'A-SPRINT GARAGE',
  webDir: 'www',                       // placeholder; pri remote-URL se ne uporablja
  server: {
    url: 'https://app.asprint-garage.si', // PROD URL — uskladi ob go-live
    cleartext: false,
  },
  plugins: {
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
};

export default config;
