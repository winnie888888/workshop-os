/**
 * Demo data (mobile demo only). Realistic A-SPRINT data — the same Slovenian
 * domestic and Croatian cross-border hauliers, the MAN brake job, the seeded
 * mechanic — shaped to match the API client's return types. The store is held
 * in memory: write actions (add a line, assign a mechanic, transition) mutate it
 * so the screens react believably, and a page reload resets to this baseline.
 * Nothing here persists and nothing leaves the browser.
 */

// Money helper: euros (number) -> minor-unit string, since the UI expects strings.
const eur = (whole: number) => String(Math.round(whole * 100));

export const LOCATION_MAIN = '00000000-0000-0000-0000-00000000l001';
const MECHANIC_ID = '00000000-0000-0000-0000-0000000a5002';

// --- Customers -------------------------------------------------------------
export const demoCustomers = [
  {
    id: 'cust-kralj', name: 'Prevozi Kralj d.o.o.', type: 'company', country: 'SI',
    vatId: 'SI58962317', vatIdValidated: true, vatIdValidationSource: 'vies',
    vatLiable: true, currency: 'EUR', paymentTermsDays: 30,
    address: 'Industrijska cesta 12', city: 'Novo mesto', postCode: '8000',
    phone: '041 728 339',
  },
  {
    id: 'cust-horvat', name: 'Transport Horvat d.o.o.', type: 'company', country: 'HR',
    vatId: 'HR47263849152', vatIdValidated: true, vatIdValidationSource: 'manual',
    vatLiable: true, currency: 'EUR', paymentTermsDays: 45,
    address: 'Slavonska avenija 3', city: 'Zagreb', postCode: '10000',
    phone: '+385 91 540 2284',
  },
  {
    id: 'cust-alpe', name: 'Alpe Logistika d.o.o.', type: 'company', country: 'SI',
    vatId: 'SI11223344', vatIdValidated: false, vatIdValidationSource: null,
    vatLiable: true, currency: 'EUR', paymentTermsDays: 30,
    address: 'Tržaška cesta 88', city: 'Ljubljana', postCode: '1000',
    phone: '040 233 901',
  },
];

// --- Vehicles (assets) -----------------------------------------------------
export const demoVehicles: Record<string, any[]> = {
  'cust-kralj': [
    { id: 'veh-man1', customerId: 'cust-kralj', plate: 'NMCK418', plateCountry: 'SI',
      make: 'MAN', model: 'TGX 18.500', vin: 'WMA06XZZ7HM601234', type: 'tractor', powertrain: 'diesel', odometer: 684500 },
  ],
  'cust-horvat': [
    { id: 'veh-man2', customerId: 'cust-horvat', plate: 'ZG7421CD', plateCountry: 'HR',
      make: 'MAN', model: 'TGX 18.500', vin: 'WMA06XZZ7HM607777', type: 'tractor', powertrain: 'diesel', odometer: 512300 },
    { id: 'veh-trail', customerId: 'cust-horvat', plate: 'ZG9001PT', plateCountry: 'HR',
      make: 'Schmitz', model: 'Cargobull', vin: 'WSM00000000123456', type: 'trailer', odometer: 0 },
  ],
  'cust-alpe': [
    { id: 'veh-volvo', customerId: 'cust-alpe', plate: 'LJ552MK', plateCountry: 'SI',
      make: 'Volvo', model: 'FH Electric', vin: 'YV2RT40A8KB812345', type: 'tractor', powertrain: 'electric', odometer: 120400 },
    { id: 'veh-daf', customerId: 'cust-alpe', plate: 'LJ318AK', plateCountry: 'SI',
      make: 'DAF', model: 'XF 480', vin: 'XLRTE47MS0E812399', type: 'tractor', powertrain: 'diesel', odometer: 388900 },
  ],
};

// --- Mechanics -------------------------------------------------------------
export const demoMechanics = [{ id: MECHANIC_ID, name: 'Marko Kovač' }];

// --- Catalogue (inventory items) -------------------------------------------
export const demoItems = [
  { id: 'item-padkit', name: 'Brake pad & disc kit, rear axle', sku: 'BPK-MAN-R', oemRef: '81.50820.6037',
    unit: 'kit', priceMinor: eur(240), vatRatePct: '22' },
  { id: 'item-airfilter', name: 'Air filter element', sku: 'AF-2245', oemRef: '81.08405.0011',
    unit: 'pcs', priceMinor: eur(38), vatRatePct: '22' },
  { id: 'item-oil', name: 'Engine oil 10W-40 (litre)', sku: 'OIL-1040', oemRef: null,
    unit: 'l', priceMinor: eur(6.5), vatRatePct: '22' },
  { id: 'item-wiper', name: 'Wiper blade 650mm', sku: 'WB-650', oemRef: null,
    unit: 'pcs', priceMinor: eur(14), vatRatePct: '22' },
];

// Per-item stock by location (on hand / reserved), matching the stock endpoint.
export const demoStock: Record<string, any[]> = {
  'item-padkit': [{ itemId: 'item-padkit', locationId: LOCATION_MAIN, onHand: 6, reserved: 1, available: 5 }],
  'item-airfilter': [{ itemId: 'item-airfilter', locationId: LOCATION_MAIN, onHand: 12, reserved: 0, available: 12 }],
  'item-oil': [{ itemId: 'item-oil', locationId: LOCATION_MAIN, onHand: 180, reserved: 0, available: 180 }],
  'item-wiper': [{ itemId: 'item-wiper', locationId: LOCATION_MAIN, onHand: 3, reserved: 0, available: 3 }],
};

// --- Work orders -----------------------------------------------------------
// One in-progress job (the MAN brake overhaul) with priced lines, and a couple
// of others to populate the board. Totals are pre-computed to look right; the
// demo does not re-run the pricing engine.
function woHeader(o: any) {
  return {
    id: o.id, number: o.number, status: o.status, customerId: o.customerId, assetId: o.assetId,
    fleetId: null, locationId: LOCATION_MAIN, complaint: o.complaint, diagnosis: o.diagnosis ?? null,
    odometer: o.odometer ?? null, currency: 'EUR', customerPo: o.customerPo ?? null,
    totalNetMinor: o.net, totalVatMinor: o.vat, totalGrossMinor: o.gross, version: 1,
    assignedMechanicId: o.assignedMechanicId ?? null,
  };
}

export const demoWorkOrders: Record<string, any> = {
  'wo-1001': {
    ...woHeader({
      id: 'wo-1001', number: '2026-1001', status: 'in_progress', customerId: 'cust-kralj', assetId: 'veh-man1',
      complaint: 'Zadnje zavore škripijo in slabše zavirajo (rear brakes squeal, brake poorly)',
      odometer: 684500, net: eur(467.5), vat: eur(102.85), gross: eur(570.35), assignedMechanicId: MECHANIC_ID,
    }),
    lines: [
      { id: 'l1', lineNo: 1, type: 'labour', description: 'Rear brake overhaul', inventoryItemId: null,
        reservedLocationId: null, quantity: '3.5', unitPriceMinor: eur(65), discountPct: '0', vatRatePct: '22',
        netMinor: eur(227.5), vatMinor: eur(50.05), grossMinor: eur(277.55), issued: false },
      { id: 'l2', lineNo: 2, type: 'part', description: 'Brake pad & disc kit, rear axle', inventoryItemId: 'item-padkit',
        reservedLocationId: LOCATION_MAIN, quantity: '1', unitPriceMinor: eur(240), discountPct: '0', vatRatePct: '22',
        netMinor: eur(240), vatMinor: eur(52.8), grossMinor: eur(292.8), issued: false },
    ],
    timeEntries: [
      { id: 't1', mechanicId: MECHANIC_ID, startedAt: new Date(Date.now() - 4.17 * 3600 * 1000).toISOString(),
        endedAt: null, durationSeconds: null, costMinor: null },
    ],
  },
  'wo-1002': {
    ...woHeader({
      id: 'wo-1002', number: '2026-1002', status: 'open', customerId: 'cust-horvat', assetId: 'veh-man2',
      complaint: 'Servis 120.000 km (120,000 km service)', odometer: 512300,
      net: eur(0), vat: eur(0), gross: eur(0),
    }),
    lines: [], timeEntries: [],
  },
  'wo-1003': {
    ...woHeader({
      id: 'wo-1003', number: '2026-1000', status: 'ready', customerId: 'cust-alpe', assetId: 'veh-volvo',
      complaint: 'Menjava zračnega filtra (air filter change)', odometer: 401200,
      net: eur(38), vat: eur(8.36), gross: eur(46.36),
    }),
    lines: [
      { id: 'l3', lineNo: 1, type: 'part', description: 'Air filter element', inventoryItemId: 'item-airfilter',
        reservedLocationId: LOCATION_MAIN, quantity: '1', unitPriceMinor: eur(38), discountPct: '0', vatRatePct: '22',
        netMinor: eur(38), vatMinor: eur(8.36), grossMinor: eur(46.36), issued: false },
    ],
    timeEntries: [],
  },
};

// Drugi 'ready' nalog za Alpe (drugo vozilo): demo zbirnega računa pokaže
// bistvo — dva naloga, en račun, vmesni seštevki po nalogu/vozilu.
demoWorkOrders['wo-1004'] = {
  ...woHeader({
    id: 'wo-1004', number: '2026-1004', status: 'ready', customerId: 'cust-alpe', assetId: 'veh-daf',
    complaint: 'Menjava metlic brisalcev in dolivanje olja (wipers + oil top-up)', odometer: 388900,
    net: eur(76), vat: eur(16.72), gross: eur(92.72),
  }),
  lines: [
    { id: 'l4', lineNo: 1, type: 'part', description: 'Wiper blade 650mm', inventoryItemId: 'item-wiper',
      reservedLocationId: LOCATION_MAIN, quantity: '2', unitPriceMinor: eur(14), discountPct: '0', vatRatePct: '22',
      netMinor: eur(28), vatMinor: eur(6.16), grossMinor: eur(34.16), issued: false },
    { id: 'l5', lineNo: 2, type: 'part', description: 'Engine oil 10W-40 (litre)', inventoryItemId: 'item-oil',
      reservedLocationId: LOCATION_MAIN, quantity: '8', unitPriceMinor: eur(6), discountPct: '0', vatRatePct: '22',
      netMinor: eur(48), vatMinor: eur(10.56), grossMinor: eur(58.56), issued: false },
  ],
  timeEntries: [],
};

// List-item projection (the board uses a flatter shape with names already joined).
export function demoListItem(id: string): any {
  const wo = demoWorkOrders[id];
  const cust = demoCustomers.find((c) => c.id === wo.customerId);
  const allVeh = Object.values(demoVehicles).flat();
  const veh = allVeh.find((v) => v.id === wo.assetId);
  return {
    id: wo.id, number: wo.number, status: wo.status, currency: wo.currency,
    locationId: wo.locationId, complaint: wo.complaint, totalGrossMinor: wo.totalGrossMinor,
    customerName: cust?.name ?? null, plate: veh?.plate ?? null, plateCountry: veh?.plateCountry ?? null,
    makeModel: veh ? `${veh.make} ${veh.model}` : null,
    hasOpenClock: wo.timeEntries.some((t: any) => !t.endedAt),
    clockedForMe: wo.timeEntries.some((t: any) => !t.endedAt && t.mechanicId === MECHANIC_ID),
    assignedMechanicId: wo.assignedMechanicId,
  };
}

// --- Invoices --------------------------------------------------------------
// Tri zgodbe, ki se ujemajo čez VSE zaslone (seznam, staranje terjatev, DDV
// poročilo, AI opozorila): odprt tekoči račun (RC), zapadli račun iz februarja
// (vir AI opozorila o izterjavi) in plačan domači račun z 22 % DDV.
export const demoInvoices: Record<string, any> = {
  'inv-1': {
    id: 'inv-1', kind: 'invoice', number: '2026-500', status: 'issued', customerId: 'cust-horvat',
    currency: 'EUR', vatTreatment: 'reverse_charge_eu', reverseCharge: true,
    vatNote: 'Obrnjena davčna obveznost — DDV obračuna prejemnik (76.a člen ZDDV-1).',
    totalNetMinor: eur(467.5), totalVatMinor: eur(0), totalGrossMinor: eur(467.5), paidMinor: eur(0),
    issueDate: '2026-06-03', dueDate: '2026-07-18', serviceDate: '2026-06-01',
    lines: [
      { id: 'il1', lineNo: 1, type: 'labour', description: 'Servisna dela — vlačilec ZG7421CD', work_order_id: null,
        quantity: '5', unit_price_minor: eur(65), discountPct: '0', vat_rate_pct: '0',
        net_minor: eur(325), vat_minor: eur(0), gross_minor: eur(325) },
      { id: 'il2', lineNo: 2, type: 'part', description: 'Zavorne obloge in potrošni material', work_order_id: null,
        quantity: '1', unit_price_minor: eur(142.5), discountPct: '0', vat_rate_pct: '0',
        net_minor: eur(142.5), vat_minor: eur(0), gross_minor: eur(142.5) },
    ],
    vatBreakdown: [{ rate_pct: '0', reverse_charge: true, net_minor: eur(467.5), vat_minor: eur(0) }],
  },
  'inv-44': {
    id: 'inv-44', kind: 'invoice', number: '2026-44', status: 'overdue', customerId: 'cust-horvat',
    currency: 'EUR', vatTreatment: 'reverse_charge_eu', reverseCharge: true,
    vatNote: 'Obrnjena davčna obveznost — DDV obračuna prejemnik (76.a člen ZDDV-1).',
    totalNetMinor: eur(2400), totalVatMinor: eur(0), totalGrossMinor: eur(2400), paidMinor: eur(0),
    issueDate: '2026-02-15', dueDate: '2026-03-31', serviceDate: '2026-02-12',
    lines: [
      { id: 'il3', lineNo: 1, type: 'labour', description: 'Generalna obnova menjalnika', work_order_id: null,
        quantity: '24', unit_price_minor: eur(65), discountPct: '0', vat_rate_pct: '0',
        net_minor: eur(1560), vat_minor: eur(0), gross_minor: eur(1560) },
      { id: 'il4', lineNo: 2, type: 'part', description: 'Sklopka in drobni material', work_order_id: null,
        quantity: '1', unit_price_minor: eur(840), discountPct: '0', vat_rate_pct: '0',
        net_minor: eur(840), vat_minor: eur(0), gross_minor: eur(840) },
    ],
    vatBreakdown: [{ rate_pct: '0', reverse_charge: true, net_minor: eur(2400), vat_minor: eur(0) }],
  },
  'inv-77': {
    id: 'inv-77', kind: 'invoice', number: '2026-77', status: 'paid', customerId: 'cust-kralj',
    currency: 'EUR', vatTreatment: 'domestic', reverseCharge: false, vatNote: null,
    totalNetMinor: eur(120), totalVatMinor: eur(26.4), totalGrossMinor: eur(146.4), paidMinor: eur(146.4),
    issueDate: '2026-06-10', dueDate: '2026-07-10', serviceDate: '2026-06-10',
    lines: [
      { id: 'il5', lineNo: 1, type: 'labour', description: 'Menjava metlic in hitri pregled', work_order_id: null,
        quantity: '1', unit_price_minor: eur(120), discountPct: '0', vat_rate_pct: '22',
        net_minor: eur(120), vat_minor: eur(26.4), gross_minor: eur(146.4) },
    ],
    vatBreakdown: [{ rate_pct: '22', reverse_charge: false, net_minor: eur(120), vat_minor: eur(26.4) }],
  },
};

// --- Owner insight (labour profitability for wo-1001) ----------------------
export const demoInsight = {
  'wo-1001': {
    workOrder: { id: 'wo-1001', number: '2026-1001', status: 'in_progress' },
    hours: { actual: 4.17, standard: 3.5, billed: 3.5 },
    efficiency: 0.84,
    profitability: { labourRevenueMinor: eur(227.5), labourCostMinor: eur(125), marginMinor: eur(102.5) },
    flags: [],
    narrative: 'Na nalogu je vpisanih 4,17 h ob normativu 3,5 h (84 % učinkovitost). Zaračunano delo €227,50 ob interni ceni €125,00 pušča €102,50 marže. Brez posebnosti.',
  } as any,
};
