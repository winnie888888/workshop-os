-- =============================================================================
-- 0006 — Customer VAT-ID validation (Phase 4C, dry-run fix)
-- =============================================================================
-- The dry run found that the invoice engine reads customer.vat_id_validated to
-- decide whether an intra-EU B2B supply may be reverse-charged, but no such
-- column existed: the field was always undefined, so every cross-border EU
-- business customer tripped the "needs human confirmation" gate and could not
-- be invoiced. These columns give that flag a real home, plus the provenance an
-- audit needs: HOW it was validated (VIES or a human's manual attestation),
-- WHEN, and BY WHOM. The row-level record complements the hash-chain audit
-- entry written on every validation action.
-- =============================================================================

ALTER TABLE app.customers
  ADD COLUMN IF NOT EXISTS vat_id_validated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_id_validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS vat_id_validation_source text
    CHECK (vat_id_validation_source IN ('vies', 'manual')),
  ADD COLUMN IF NOT EXISTS vat_id_validated_by uuid REFERENCES app.users(id),
  -- A free-text note captured with a MANUAL confirmation (e.g. "VIES portal
  -- checked 2026-06-07, customer VAT certificate on file"). Null for VIES.
  ADD COLUMN IF NOT EXISTS vat_id_validation_note text;

-- A validated VAT id must record how it was validated; an unvalidated one must
-- not pretend to a source. This keeps the provenance honest at the row level.
ALTER TABLE app.customers
  ADD CONSTRAINT customers_vat_validation_provenance
  CHECK (
    (vat_id_validated = true  AND vat_id_validation_source IS NOT NULL AND vat_id_validated_at IS NOT NULL)
    OR
    (vat_id_validated = false AND vat_id_validation_source IS NULL)
  );

COMMENT ON COLUMN app.customers.vat_id_validated IS
  'True only when the VAT id has been validated via VIES or by an audited manual confirmation. Gates EU reverse charge.';
