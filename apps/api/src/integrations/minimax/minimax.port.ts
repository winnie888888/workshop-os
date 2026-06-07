/**
 * Minimax integration port (anti-corruption layer, Master Blueprint §9).
 * The domain depends only on this interface; the HTTP details live in the
 * adapter and never leak inward. Swappable to Pantheon/Saop later.
 */

export interface MinimaxPartner {
  /** Our customer id, used as the external idempotency reference. */
  externalRef: string;
  name: string;
  country: string; // ISO 3166-1 alpha-2
  address: string | null;
  postCode: string | null;
  city: string | null;
  vatId: string | null;
  taxId: string | null;
  currency: string; // ISO 4217
  paymentTermsDays: number;
  discountPct: string;
  /** Present when the partner already exists in Minimax (update vs create). */
  minimaxPartnerId: string | null;
}

export interface MinimaxPort {
  /** Create or update a partner. Returns the Minimax partner id. */
  upsertPartner(tenantId: string, partner: MinimaxPartner): Promise<{ minimaxPartnerId: string }>;

  /** Create or update an issued invoice / credit note. Returns the Minimax document id. */
  upsertInvoice(tenantId: string, invoice: unknown): Promise<{ minimaxInvoiceId: string }>;
}

export const MINIMAX_PORT = 'MINIMAX_PORT';
