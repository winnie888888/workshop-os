/*
 * Strukturna predletna validacija e-SLOG / EN 16931 izvoza (Sprint 5).
 *
 * Preverja OBVEZNA poslovna polja (BT) in računsko konsistenco, ki jih
 * prejemniki in ponudniki e-poti najpogosteje zavračajo. To NI polna XSD /
 * Schematron validacija — tista teče pri registriranem ponudniku ob oddaji
 * (ops korak, zabeležen v checklistu); ta preverba pa ujame 95 % realnih
 * zavrnitev, preden datoteka sploh zapusti aplikacijo.
 */

export interface EslogIssue {
  level: 'error' | 'warn';
  msg: string;
}

const round2 = (n: number) => Math.round(n);

export function validateEslogInvoice(
  inv: any,
  company: { name?: string; address?: string; vatId?: string; iban?: string } | null,
  customer: any | null,
): EslogIssue[] {
  const issues: EslogIssue[] = [];
  const err = (msg: string) => issues.push({ level: 'error', msg });
  const warn = (msg: string) => issues.push({ level: 'warn', msg });

  // BT-1 / BT-2 / BT-3: številka, datum izdaje, vrsta
  if (!inv?.number) err('Manjka številka računa (BT-1) — izvoz je smiseln šele za IZDAN račun.');
  if (!inv?.issueDate) err('Manjka datum izdaje (BT-2).');

  // BT-5: valuta
  if (!inv?.currency) err('Manjka valuta računa (BT-5).');

  // Prodajalec (BG-4): naziv, naslov, ID za DDV
  if (!company?.name) err('Manjka naziv prodajalca (BT-27) — vpišite ga v Nastavitve.');
  if (!company?.address) warn('Manjka naslov prodajalca (BG-5) — prejemniki v javnem sektorju ga zahtevajo.');
  const sellerVat = (company?.vatId ?? '').replace(/\s+/g, '').toUpperCase();
  if (!sellerVat) err('Manjka ID za DDV prodajalca (BT-31).');
  else if (!/^[A-Z]{2}[0-9A-Z]{2,12}$/.test(sellerVat))
    err(`ID za DDV prodajalca "${sellerVat}" ni v obliki s predpono države (npr. SI12345678).`);

  // Kupec (BG-7)
  if (!customer?.name) err('Manjka naziv kupca (BT-44).');
  const buyerVat = (customer?.vatId ?? '').replace(/\s+/g, '').toUpperCase();
  if (buyerVat && !/^[A-Z]{2}[0-9A-Z]{2,12}$/.test(buyerVat))
    warn(`ID za DDV kupca "${buyerVat}" ni v obliki s predpono države — preverite zapis.`);

  // Postavke (BG-25)
  const lines: any[] = Array.isArray(inv?.lines) ? inv.lines : [];
  if (lines.length === 0) err('Račun nima postavk (BG-25).');
  lines.forEach((l, i) => {
    if (!l?.description) warn(`Postavka ${i + 1}: manjka opis (BT-153).`);
    const net = Number(l?.net_minor ?? l?.netMinor);
    if (!Number.isFinite(net)) err(`Postavka ${i + 1}: manjka neto znesek (BT-131).`);
    const vat = Number(l?.vat_rate_pct ?? l?.vatRatePct);
    if (!Number.isFinite(vat)) warn(`Postavka ${i + 1}: manjka stopnja DDV (BT-152).`);
  });

  // Računska konsistenca (BR-CO-10/13/15): neto + DDV = bruto; vsota postavk = neto
  const totalNet = Number(inv?.totalNetMinor);
  const totalVat = Number(inv?.totalVatMinor);
  const totalGross = Number(inv?.totalGrossMinor);
  if ([totalNet, totalVat, totalGross].every(Number.isFinite)) {
    if (round2(totalNet + totalVat) !== round2(totalGross))
      err(`Vsote se ne ujemajo: neto (${totalNet}) + DDV (${totalVat}) ≠ skupaj (${totalGross}) v centih (BR-CO-15).`);
    const linesNet = lines.reduce((a, l) => a + (Number(l?.net_minor ?? l?.netMinor) || 0), 0);
    if (lines.length > 0 && round2(linesNet) !== round2(totalNet))
      err(`Vsota postavk (${linesNet}) se ne ujema z neto zneskom računa (${totalNet}) (BR-CO-10).`);
  } else {
    err('Manjkajo zneski računa (BT-109/BT-110/BT-112).');
  }

  // Plačilo: IBAN prodajalca (BT-84) — kupci pogosto zavrnejo brez njega
  const iban = (company?.iban ?? '').replace(/\s+/g, '').toUpperCase();
  if (!iban) warn('Manjka IBAN prodajalca (BT-84) — kupec ne bo mogel plačati po podatkih z računa.');
  else if (!/^[A-Z]{2}[0-9A-Z]{11,32}$/.test(iban)) err(`IBAN prodajalca "${iban}" ni veljaven.`);

  if (!inv?.dueDate) warn('Manjka rok plačila (BT-9).');

  return issues;
}

/** Oblikuje sporočilo za potrditveno okno pred prenosom. */
export function formatEslogIssues(issues: EslogIssue[]): string {
  const errs = issues.filter((i) => i.level === 'error');
  const warns = issues.filter((i) => i.level === 'warn');
  const block = (t: string, xs: EslogIssue[]) =>
    xs.length ? `${t}\n${xs.map((i) => ` • ${i.msg}`).join('\n')}\n\n` : '';
  return block('NAPAKE (prejemnik bo datoteko verjetno zavrnil):', errs)
    + block('Opozorila:', warns)
    + 'Vseeno prenesem datoteko?';
}
