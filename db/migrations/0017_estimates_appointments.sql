-- =============================================================================
-- 0017 — Estimates (predračuni) + Appointments (advisor calendar)
-- =============================================================================
-- Two thin but connected planning documents that until now lived only in the
-- demo store. Making them real closes the front half of the document chain:
--
--   appointment → work order → estimate → invoice
--
-- Estimates are QUOTES: a priced offer the advisor sends before work is
-- committed. Lines are stored as a JSONB document, deliberately: a quote is a
-- proposal, not a stock transaction — nothing reserves inventory or books
-- labour until it is converted. On conversion (POST /estimates/:id/to-invoice)
-- the lines flow through the EXISTING invoice engine (issueFromLines), which
-- applies the deterministic VAT treatment, gapless numbering, audit, Minimax
-- and e-invoice outbox. So the money path stays single and proven; the quote
-- merely feeds it. The created invoice id is linked back here.
--
-- Appointments are WALL-CLOCK workshop times ("Friday 08:00 in the shop"), so
-- start/end are `timestamp` WITHOUT time zone on purpose — a booking does not
-- shift when a server or browser changes zones. The API reads them back with
-- to_char so the string the advisor saved is the string they see.
--
-- Forced tenant RLS and touch triggers throughout, as everywhere in the system.
-- =============================================================================

-- --- Estimates (quotes) ------------------------------------------------------
CREATE TABLE app.estimates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  number        text NOT NULL,
  customer_id   uuid NOT NULL REFERENCES app.customers(id) ON DELETE RESTRICT,
  asset_id      uuid REFERENCES app.assets(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES app.work_orders(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','sent','accepted','rejected','invoiced')),
  -- Quote lines as a document: [{id, kind, description, qty, unitPriceMinor,
  -- vatRatePct, discountPct?}]. Validated and normalized by the API on write.
  lines         jsonb NOT NULL DEFAULT '[]'::jsonb,
  valid_until   date,
  -- Set when converted; the invoice itself is a normal app.invoices row.
  invoice_id    uuid REFERENCES app.invoices(id) ON DELETE SET NULL,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_estimates_tenant_created  ON app.estimates(tenant_id, created_at DESC);
CREATE INDEX idx_estimates_tenant_customer ON app.estimates(tenant_id, customer_id);
CREATE UNIQUE INDEX uq_estimates_tenant_number ON app.estimates(tenant_id, number);

-- --- Appointments (advisor calendar) -----------------------------------------
CREATE TABLE app.appointments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  customer_id   uuid REFERENCES app.customers(id) ON DELETE SET NULL,
  asset_id      uuid REFERENCES app.assets(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES app.work_orders(id) ON DELETE SET NULL,
  title         text NOT NULL,
  -- Wall-clock shop time, see header note. No tz on purpose.
  start_at      timestamp NOT NULL,
  end_at        timestamp,
  duration_min  int,
  note          text,
  status        text NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','done','cancelled')),
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at IS NULL OR end_at > start_at)
);
CREATE INDEX idx_appointments_tenant_start    ON app.appointments(tenant_id, start_at);
CREATE INDEX idx_appointments_tenant_customer ON app.appointments(tenant_id, customer_id);

-- --- Touch triggers -----------------------------------------------------------
CREATE TRIGGER trg_estimates_touch    BEFORE UPDATE ON app.estimates    FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_appointments_touch BEFORE UPDATE ON app.appointments FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- --- Tenant isolation ----------------------------------------------------------
ALTER TABLE app.estimates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.estimates    FORCE ROW LEVEL SECURITY;
ALTER TABLE app.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.appointments FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON app.estimates
  USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY tenant_isolation ON app.appointments
  USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

-- Appointments are removable from the calendar (estimates are not deleted —
-- they are rejected — so DELETE stays withheld there).
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA app TO workshop_app;
GRANT DELETE ON app.appointments TO workshop_app;
