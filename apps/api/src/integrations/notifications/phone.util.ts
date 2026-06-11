/**
 * Normalizacija telefonske številke v E.164 za SMS/WhatsApp pošiljanje.
 * Slovenski kontekst (anchor tenant): "040 692 789" -> "+38640692789".
 * Že mednarodne oblike (+ ali 00 predpona) se samo počistijo. Funkcija je
 * namerno čista (brez odvisnosti), da jo delijo sprožilci in adapterji.
 */
export function normalizeSiPhone(raw: string): string {
  const cleaned = (raw ?? '').replace(/[\s\-().]/g, '');
  if (cleaned === '') return cleaned;
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith('0')) return `+386${cleaned.slice(1)}`;
  return `+${cleaned}`;
}
