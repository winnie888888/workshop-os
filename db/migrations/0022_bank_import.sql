-- =============================================================================
-- 0022 — Uvoz bančnih izpiskov camt.053 (Plačila P2)
-- =============================================================================
-- Delavnica uvozi izpisek iz e-banke; sistem prebere prilive, jih po RF/SI
-- sklicu poveže z izdanimi računi in plačila knjiži (payments +
-- payment_allocations + posodobitev računa — obstoječi mehanizem).
--
-- Idempotenca: vsak prebran priliv dobi prstni odtis (AcctSvcrRef / EndToEndId
-- / hash vsebine) z UNIQUE (tenant_id, fingerprint) — ponovni uvoz istega
-- izpiska ne more podvojiti knjižbe. Vrstica nastane kot 'pending' PRED
-- knjižbo in se po njej označi 'applied'; prekinjen postopek se ob ponovnem
-- uvozu varno nadaljuje (pending brez payment_id se sme knjižiti).
-- =============================================================================

CREATE TABLE app.bank_imports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  filename       text,
  account_iban   text,
  stmt_from      date,
  stmt_to        date,
  entries_total  int NOT NULL DEFAULT 0,
  entries_credit int NOT NULL DEFAULT 0,
  created_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bank_imports_tenant ON app.bank_imports(tenant_id, created_at DESC);

CREATE TABLE app.bank_import_entries (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  import_id          uuid REFERENCES app.bank_imports(id) ON DELETE SET NULL,
  fingerprint        text NOT NULL,
  amount_minor       bigint NOT NULL,
  currency           char(3) NOT NULL DEFAULT 'EUR',
  booking_date       date,
  payer_name         text,
  payer_iban         text,
  reference          text,
  details            text,
  status             text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','applied','skipped')),
  matched_invoice_id uuid REFERENCES app.invoices(id) ON DELETE SET NULL,
  payment_id         uuid REFERENCES app.payments(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, fingerprint)
);
CREATE INDEX idx_bank_entries_tenant ON app.bank_import_entries(tenant_id, created_at DESC);

ALTER TABLE app.bank_imports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.bank_import_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON app.bank_imports
  USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY tenant_isolation ON app.bank_import_entries
  USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

GRANT SELECT, INSERT, UPDATE ON app.bank_imports        TO workshop_app;
GRANT SELECT, INSERT, UPDATE ON app.bank_import_entries TO workshop_app;

COMMENT ON COLUMN app.bank_import_entries.fingerprint IS 'AcctSvcrRef / EndToEndId / hash — idempotenca uvoza po najemniku.';
