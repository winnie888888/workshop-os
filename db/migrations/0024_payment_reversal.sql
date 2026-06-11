-- =============================================================================
-- 0024 — Razknjiženje plačila (Plačila P2.1)
-- =============================================================================
-- Plačilo se NIKOLI ne briše: alokacije so append-only ledger (0004) in
-- revizijska sled mora preživeti. Storno je oznaka na plačilu (reversed_at /
-- reversed_by / reversal_reason); InvoicesService.reversePayment ob tem vrne
-- paid_minor in status na vseh računih, ki jih je plačilo pokrivalo.
-- Razknjiženo plačilo ne šteje več kot denar: paid_minor je popravljen,
-- morebitni unapplied_minor (preplačilo) pa z oznako preneha veljati kot
-- dobroimetje — vsak prihodnji izračun dobroimetja mora razknjižena plačila
-- izločiti (WHERE reversed_at IS NULL).
-- =============================================================================

ALTER TABLE app.payments
  ADD COLUMN IF NOT EXISTS reversed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_by     uuid,
  ADD COLUMN IF NOT EXISTS reversal_reason text;

COMMENT ON COLUMN app.payments.reversed_at IS 'Storno: plačilo razknjiženo (paid_minor na računih vrnjen); NULL = veljavno plačilo.';
