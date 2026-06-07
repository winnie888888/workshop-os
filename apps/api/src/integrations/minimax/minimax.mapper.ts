import type { Customer } from '@workshop/shared';
import type { MinimaxPartner } from './minimax.port';

/**
 * Maps our domain Customer onto the Minimax partner shape. Field mapping
 * mirrors the A-SPRINT Minimax export (Master Blueprint §9):
 *   name -> Naziv, country -> Država, vatId -> Identifikacijska številka,
 *   taxId -> Davčna številka, paymentTermsDays -> Dnevi za zapadlost,
 *   discountPct -> Odstotek rabata.
 */
export function toMinimaxPartner(c: Customer): MinimaxPartner {
  return {
    externalRef: c.id,
    name: c.name,
    country: c.country,
    address: c.address,
    postCode: c.postCode,
    city: c.city,
    vatId: c.vatId,
    taxId: c.taxId,
    currency: c.currency,
    paymentTermsDays: c.paymentTermsDays,
    discountPct: c.discountPct,
    minimaxPartnerId: c.minimaxPartnerId,
  };
}
