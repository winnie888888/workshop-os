-- =====================================================================
-- Migration 0004 — Invoicing, VAT, Accounts Receivable, e-Invoicing
--
-- This migration adds the money-and-compliance layer on top of the shop floor:
-- issued invoices and credit notes (immutable once issued), their VAT breakdown,
-- the payments that settle them, the e-invoice/fiscalization envelopes that carry
-- them to tax authorities (HR Fiskalizacija 2.0 now; SI eSLOG/Peppol by 2028),
-- and the labour-standards catalogue that lets us bill book time while comparing
-- it against clocked time.
--
-- Conventions unchanged from earlier phases: tenant_id everywhere, RLS enabled
-- AND forced, money as bigint minor units + currency, append-only ledgers via
-- rules, updated_at triggers.
-- =====================================================================

BEGIN;

-- The VAT engine may only apply reverse charge when a customer's EU VAT ID has
-- been validated (VIES). Track that state on the customer.
ALTER TABLE app.customers
  ADD COLUMN IF NOT EXISTS vat_id_validated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_id_validated_at timestamptz;

-- ---------------------------------------------------------------------
-- Labour standards — the "book time" catalogue. Billing uses these standard
-- minutes; clocked time is compared against them for productivity. A standard
-- may be keyed to an operation code and optionally scoped to a vehicle class.
-- ---------------------------------------------------------------------
CREATE TABLE app.labour_standards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  op_code       text NOT NULL,                 -- e.g. 'BRAKE-PADS-FRONT'
  description   text NOT NULL,
  vehicle_class text,                          -- optional: 'tractor','trailer',...
  standard_minutes int NOT NULL CHECK (standard_minutes > 0),
  source        text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','oem','tecdoc')),
  version       int NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, op_code, vehicle_class)
);
CREATE INDEX idx_labour_std_tenant ON app.labour_standards(tenant_id, op_code);

-- Carry the standard + clocked picture onto labour lines so a work order can
-- show all three numbers (standard, clocked, billed) per the Phase 3 rule.
ALTER TABLE app.work_order_lines
  ADD COLUMN IF NOT EXISTS standard_minutes int,    -- book time for this labour line
  ADD COLUMN IF NOT EXISTS clocked_seconds  int;    -- actual time attributed to it

-- ---------------------------------------------------------------------
-- Invoices & credit notes. A credit note is an invoice row with kind
-- 'credit_note' and a reference back to the invoice it corrects. Once status
-- leaves 'draft' the financial fields are immutable (enforced by trigger);
-- corrections are made by issuing a credit note, never by editing.
-- ---------------------------------------------------------------------
CREATE TABLE app.invoices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  kind              text NOT NULL DEFAULT 'invoice' CHECK (kind IN ('invoice','credit_note','proforma')),
  number            text,                       -- gapless, assigned on issue
  work_order_id     uuid REFERENCES app.work_orders(id) ON DELETE SET NULL,
  customer_id       uuid NOT NULL REFERENCES app.customers(id) ON DELETE RESTRICT,
  corrects_invoice_id uuid REFERENCES app.invoices(id) ON DELETE RESTRICT, -- for credit notes
  status            text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','issued','sent','partly_paid','paid','overdue','credited','void')),
  currency          char(3) NOT NULL DEFAULT 'EUR',
  -- VAT treatment summary (the engine's decision, frozen at issue time)
  vat_treatment     text,                       -- 'standard_si_vat','reverse_charge_eu',...
  reverse_charge    boolean NOT NULL DEFAULT false,
  vat_note          text,                       -- legal note printed on the document
  -- money, minor units
  total_net_minor   bigint NOT NULL DEFAULT 0,
  total_vat_minor   bigint NOT NULL DEFAULT 0,
  total_gross_minor bigint NOT NULL DEFAULT 0,
  paid_minor        bigint NOT NULL DEFAULT 0,
  -- dates
  issue_date        date,
  due_date          date,
  issued_at         timestamptz,
  -- integration linkage
  minimax_invoice_id text,
  version           int NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  issued_by         uuid
);
CREATE INDEX idx_invoices_tenant_status ON app.invoices(tenant_id, status);
CREATE INDEX idx_invoices_tenant_customer ON app.invoices(tenant_id, customer_id);
CREATE INDEX idx_invoices_tenant_due ON app.invoices(tenant_id, due_date) WHERE status IN ('issued','sent','partly_paid','overdue');
CREATE UNIQUE INDEX uq_invoices_number ON app.invoices(tenant_id, number) WHERE number IS NOT NULL;

CREATE TABLE app.invoice_lines (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  invoice_id    uuid NOT NULL REFERENCES app.invoices(id) ON DELETE CASCADE,
  line_no       int NOT NULL,
  type          text NOT NULL,                  -- labour/part/sublet/fee/...
  description   text NOT NULL,
  quantity      numeric(12,3) NOT NULL DEFAULT 1,
  unit_price_minor bigint NOT NULL DEFAULT 0,
  discount_pct  numeric(5,2) NOT NULL DEFAULT 0,
  -- effective VAT after the engine's decision (0 for RC/export)
  vat_rate_pct  numeric(5,2) NOT NULL DEFAULT 0,
  reverse_charge boolean NOT NULL DEFAULT false,
  net_minor     bigint NOT NULL DEFAULT 0,
  vat_minor     bigint NOT NULL DEFAULT 0,
  gross_minor   bigint NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, line_no)
);
CREATE INDEX idx_invoice_lines_tenant_inv ON app.invoice_lines(tenant_id, invoice_id);

-- Per-rate VAT breakdown, frozen at issue (what the document and VAT return show).
CREATE TABLE app.invoice_vat_breakdown (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  invoice_id   uuid NOT NULL REFERENCES app.invoices(id) ON DELETE CASCADE,
  rate_pct     numeric(5,2) NOT NULL,
  reverse_charge boolean NOT NULL DEFAULT false,
  net_minor    bigint NOT NULL,
  vat_minor    bigint NOT NULL,
  UNIQUE (invoice_id, rate_pct, reverse_charge)
);

-- Immutability: once an invoice is no longer 'draft', its financial fields and
-- number cannot change. Status/paid/version may still advance.
CREATE OR REPLACE FUNCTION app.invoices_guard_immutable() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'draft' THEN
    IF NEW.number IS DISTINCT FROM OLD.number
       OR NEW.total_net_minor IS DISTINCT FROM OLD.total_net_minor
       OR NEW.total_vat_minor IS DISTINCT FROM OLD.total_vat_minor
       OR NEW.total_gross_minor IS DISTINCT FROM OLD.total_gross_minor
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.issue_date IS DISTINCT FROM OLD.issue_date
       OR NEW.vat_treatment IS DISTINCT FROM OLD.vat_treatment THEN
      RAISE EXCEPTION 'Issued invoice % is immutable; use a credit note to correct it', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_invoices_immutable BEFORE UPDATE ON app.invoices
  FOR EACH ROW EXECUTE FUNCTION app.invoices_guard_immutable();

-- ---------------------------------------------------------------------
-- Payments & allocations (AR). A payment is money received; allocations apply
-- it to one or more invoices. The allocation rows are an append-only ledger.
-- ---------------------------------------------------------------------
CREATE TABLE app.payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  customer_id   uuid NOT NULL REFERENCES app.customers(id) ON DELETE RESTRICT,
  currency      char(3) NOT NULL DEFAULT 'EUR',
  amount_minor  bigint NOT NULL CHECK (amount_minor > 0),
  method        text NOT NULL DEFAULT 'bank' CHECK (method IN ('bank','cash','card','other')),
  received_at   date NOT NULL,
  reference     text,
  unapplied_minor bigint NOT NULL DEFAULT 0,    -- credit on account (overpayment)
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid
);
CREATE INDEX idx_payments_tenant_customer ON app.payments(tenant_id, customer_id);

CREATE TABLE app.payment_allocations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  payment_id   uuid NOT NULL REFERENCES app.payments(id) ON DELETE CASCADE,
  invoice_id   uuid NOT NULL REFERENCES app.invoices(id) ON DELETE RESTRICT,
  applied_minor bigint NOT NULL CHECK (applied_minor > 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pay_alloc_invoice ON app.payment_allocations(tenant_id, invoice_id);
CREATE RULE pay_alloc_no_update AS ON UPDATE TO app.payment_allocations DO INSTEAD NOTHING;
CREATE RULE pay_alloc_no_delete AS ON DELETE TO app.payment_allocations DO INSTEAD NOTHING;

-- ---------------------------------------------------------------------
-- e-Invoice / fiscalization envelopes. One row per outbound legal document
-- transmission, with the format, the built payload, and a status state machine.
-- HR Fiskalizacija 2.0 is live now; SI eSLOG 2.0 / Peppol arrives by 2028. The
-- provider/format is per-document so we can route HR vs SI differently.
-- ---------------------------------------------------------------------
CREATE TABLE app.einvoice_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  invoice_id    uuid NOT NULL REFERENCES app.invoices(id) ON DELETE CASCADE,
  channel       text NOT NULL CHECK (channel IN ('hr_fiscalization','si_eslog_peppol','peppol')),
  format        text NOT NULL,                  -- 'UBL','CII','eSLOG2.0','HR-FISKAL'
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','built','signed','transmitted','acknowledged','rejected','failed')),
  payload       text,                           -- the generated XML (or reference)
  authority_ref text,                           -- JIR/ZKI (HR) or Peppol message id
  last_error    text,
  attempts      int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, channel)
);
CREATE INDEX idx_einvoice_tenant_status ON app.einvoice_documents(tenant_id, status);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_labour_std_touch BEFORE UPDATE ON app.labour_standards   FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_invoices_touch   BEFORE UPDATE ON app.invoices           FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_einvoice_touch   BEFORE UPDATE ON app.einvoice_documents FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- =====================================================================
-- RLS on all new tenant-scoped tables (enabled AND forced).
-- =====================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'labour_standards','invoices','invoice_lines','invoice_vat_breakdown',
    'payments','payment_allocations','einvoice_documents'
  ] LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON app.%I
        USING (tenant_id = app.current_tenant_id())
        WITH CHECK (tenant_id = app.current_tenant_id());
    $f$, t);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA app TO workshop_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO workshop_app;

COMMIT;
