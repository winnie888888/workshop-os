-- =============================================================================
-- 0010 — Customer Portal: sessions, approvals, appointment requests
-- =============================================================================
-- The portal lets a customer (an external party, not a staff member) see their
-- own vehicles, jobs and invoices, approve additional work, and request
-- appointments. These three tables support that. Every one carries tenant_id
-- and a customer_id, and inherits forced RLS for tenant isolation; the portal
-- service ALSO filters every query by the authenticated customer_id, so a
-- customer is isolated both across tenants (RLS) and within a tenant (explicit
-- customer scope) — defence in depth. Nothing here changes existing tables.
-- =============================================================================

-- --- Portal sessions ---------------------------------------------------------
-- A magic link (a short-lived signed token) is exchanged for a portal SESSION.
-- We store only the HASH of the session secret, never the secret itself, so a
-- database leak cannot be replayed as a login. Sessions are revocable and carry
-- last_seen for idle expiry, mirroring the staff user_sessions table.
CREATE TABLE app.portal_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  customer_id   uuid NOT NULL REFERENCES app.customers(id) ON DELETE CASCADE,
  token_hash    text NOT NULL,                 -- SHA-256 of the session secret
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz
);
CREATE INDEX idx_portal_sessions_lookup ON app.portal_sessions(tenant_id, token_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_portal_sessions_customer ON app.portal_sessions(tenant_id, customer_id);

-- --- Work-order approvals (additional work + estimate workflow) --------------
-- When extra work is discovered (or an up-front estimate needs sign-off), the
-- advisor raises an approval request against a work order. The customer reviews
-- it in the portal and approves or declines; the decision is recorded with a
-- timestamp and audited. We keep the proposed items as JSON so this does not
-- require changing the work_order_lines schema — on approval the advisor adds
-- the real priced lines through the existing line path.
CREATE TABLE app.work_order_approvals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  customer_id     uuid NOT NULL REFERENCES app.customers(id) ON DELETE CASCADE,
  work_order_id   uuid NOT NULL REFERENCES app.work_orders(id) ON DELETE CASCADE,
  kind            text NOT NULL DEFAULT 'additional_work'
                    CHECK (kind IN ('additional_work','estimate')),
  title           text NOT NULL,
  -- Proposed items: [{description, quantity, unitPriceMinor, vatRatePct}], plus
  -- a pre-computed total so the portal can show the figure without re-pricing.
  proposed_items  jsonb NOT NULL DEFAULT '[]'::jsonb,
  amount_net_minor   bigint NOT NULL DEFAULT 0,
  amount_gross_minor bigint NOT NULL DEFAULT 0,
  currency        char(3) NOT NULL DEFAULT 'EUR',
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','declined','expired','cancelled')),
  responded_at    timestamptz,
  response_note   text,
  created_by      uuid,                         -- the advisor who raised it
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_approvals_customer ON app.work_order_approvals(tenant_id, customer_id, status);
CREATE INDEX idx_approvals_wo ON app.work_order_approvals(tenant_id, work_order_id);

-- --- Appointment requests ----------------------------------------------------
-- A customer asks for a service slot from the portal. This is a request, not a
-- booking: the advisor turns it into a real work order. Kept lightweight.
CREATE TABLE app.appointment_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  customer_id     uuid NOT NULL REFERENCES app.customers(id) ON DELETE CASCADE,
  asset_id        uuid REFERENCES app.assets(id) ON DELETE SET NULL,
  preferred_date  date,
  description     text,
  status          text NOT NULL DEFAULT 'requested'
                    CHECK (status IN ('requested','scheduled','declined','cancelled')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_appt_customer ON app.appointment_requests(tenant_id, customer_id, status);

-- touch triggers
CREATE TRIGGER trg_approvals_touch BEFORE UPDATE ON app.work_order_approvals FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_appt_touch      BEFORE UPDATE ON app.appointment_requests FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- Forced tenant RLS on all three new tables (same block shape as elsewhere).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['portal_sessions','work_order_approvals','appointment_requests'] LOOP
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
