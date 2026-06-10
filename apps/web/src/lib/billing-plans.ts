/*
 * Paketi A-SPRINT GARAGE — skupna meta za zaslon Zaračunavanje in javni /cenik.
 *
 * POZOR: zneski tukaj so PRIKAZNI in predlog cenika; dejansko zaračunani
 * znesek določa Stripe Price ID v okolju API-ja (STRIPE_PRICE_*). Ob potrditvi
 * cenika uskladi oboje na isti znesek.
 */

export interface PlanMeta {
  id: 'start' | 'delavnica' | 'flota';
  label: string;
  priceEur: number;       // €/mesec brez DDV — prikazni predlog
  tagline: string;
  highlight?: boolean;
  features: string[];
}

export const PLANS: PlanMeta[] = [
  {
    id: 'start',
    label: 'Start',
    priceEur: 49,
    tagline: 'Za samostojnega mojstra ali malo delavnico.',
    features: [
      'Do 3 uporabniki',
      'Delovni nalogi, stranke, vozila',
      'Računi + UPN QR plačila',
      'Predračuni in koledar',
      'Mobilni dostop (PWA)',
    ],
  },
  {
    id: 'delavnica',
    label: 'Delavnica',
    priceEur: 99,
    tagline: 'Polna delavnica s skladiščem in računovodsko povezavo.',
    highlight: true,
    features: [
      'Do 10 uporabnikov',
      'Vse iz paketa Start',
      'Skladišče: prevzemi, inventura, naročila',
      'Minimax sinhronizacija + e-SLOG izvoz',
      'AI: glas → nalog, OCR prevzem, tablice',
      'Evidenca ur in potni nalogi',
    ],
  },
  {
    id: 'flota',
    label: 'Flota',
    priceEur: 199,
    tagline: 'Za delavnice s flotnimi pogodbami in več lokacijami.',
    features: [
      'Neomejeni uporabniki',
      'Vse iz paketa Delavnica',
      'Portal za flotne stranke',
      'Najem nadomestnih vozil',
      'Lastniška analitika in AI opozorila',
      'Prednostna podpora',
    ],
  },
];

export const PLAN_LABELS: Record<string, string> = Object.fromEntries(
  PLANS.map((p) => [p.id, p.label]),
);
PLAN_LABELS['trial'] = 'Preizkus';
PLAN_LABELS['founders'] = 'Founders';
