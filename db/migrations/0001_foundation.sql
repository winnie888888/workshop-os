-- =====================================================================
-- Migration 0001 — Foundation
-- AI Workshop OS. Implements: multi-tenancy + RLS, identity, core domain
-- (customers, assets), gapless document counters, hash-chained audit log,
-- transactional outbox, and AI Gateway provenance.
--
-- Conventions (Architecture Blueprint §3.3, §4; Master Blueprint §4, §8):
--   * Every tenant-scoped table carries tenant_id and is protected by RLS.
--   * RLS is FORCED so even the table owner is constrained.
--   * The application sets `app.current_tenant_id` per transaction
--     (SET LOCAL) before any query; current_tenant_id() reads it.
--   * Money is stored as bigint minor units + a currency code.
--   * Issued financial documents are immutable (enforced in later migrations).
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive email
CREATE SCHEMA IF NOT EXISTS app;

-- Reads the tenant id bound to the current transaction. NULL if unset.
CREATE OR REPLACE FUNCTION app.current_tenant_id() RETURNS uuid
  LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
$$;

-- Generic updated_at trigger.
CREATE OR REPLACE FUNCTION app.touch_updated_at() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Helper to apply standard RLS to a tenant-scoped table.
-- (Inlined per table below for clarity rather than dynamic SQL.)

-- ---------------------------------------------------------------------
-- Identity & Tenant (not tenant-scoped: tenants/users are global roots)
-- ---------------------------------------------------------------------
CREATE TABLE app.tenants (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  country          char(2) NOT NULL,
  vat_id           text,
  tax_id           text,
  registration_no  text,
  default_currency char(3) NOT NULL DEFAULT 'EUR',
  languages        text[] NOT NULL DEFAULT ARRAY['sl','en'],
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       citext NOT NULL UNIQUE,
  name        text NOT NULL,
  locale      text NOT NULL DEFAULT 'sl',
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  -- subject claim from the OIDC IdP; links a token to a user
  external_subject text UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.memberships (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  roles      text[] NOT NULL DEFAULT '{}',  -- values validated by app/shared roles.ts
  active      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX idx_memberships_user ON app.memberships(user_id);

CREATE TABLE app.locations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  name       text NOT NULL,
  address    text,
  bays       int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_locations_tenant ON app.locations(tenant_id);

-- ---------------------------------------------------------------------
-- Core domain: Customers & Assets (PRD §4.2, §4.3)
-- ---------------------------------------------------------------------
CREATE TABLE app.customers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  code               text,
  name               text NOT NULL,
  type               text NOT NULL DEFAULT 'company' CHECK (type IN ('individual','company')),
  country            char(2) NOT NULL,
  address            text,
  post_code          text,
  city               text,
  vat_liable         boolean NOT NULL DEFAULT true,
  vat_id             text,
  tax_id             text,
  registration_no    text,
  currency           char(3) NOT NULL DEFAULT 'EUR',
  payment_terms_days int NOT NULL DEFAULT 30,
  discount_pct       numeric(5,2) NOT NULL DEFAULT 0,
  price_list_id      uuid,
  einvoice_capable   boolean NOT NULL DEFAULT false,
  peppol_id          text,
  minimax_partner_id text,
  notes              text,
  status             text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  version            int NOT NULL DEFAULT 1,  -- optimistic lock
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid,
  updated_by         uuid
);
CREATE INDEX idx_customers_tenant_name ON app.customers(tenant_id, lower(name));
CREATE UNIQUE INDEX uq_customers_tenant_code ON app.customers(tenant_id, code) WHERE code IS NOT NULL;
CREATE UNIQUE INDEX uq_customers_tenant_minimax ON app.customers(tenant_id, minimax_partner_id) WHERE minimax_partner_id IS NOT NULL;

CREATE TABLE app.assets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  customer_id       uuid NOT NULL REFERENCES app.customers(id) ON DELETE RESTRICT,
  fleet_id          uuid,
  type              text NOT NULL CHECK (type IN ('tractor','truck','van','trailer','other')),
  plate             text NOT NULL,         -- normalized (upper, no spaces) by the app
  country_of_plate  char(2) NOT NULL,
  vin               text,
  make              text,
  model             text,
  year              int,
  odometer_last     int,
  engine_hours_last int,
  tecdoc_type_id    text,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','scrapped')),
  version           int NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  updated_by        uuid
);
CREATE INDEX idx_assets_tenant_customer ON app.assets(tenant_id, customer_id);
-- A plate is unique per (country, plate) within a tenant (PRD FR-AST-1).
CREATE UNIQUE INDEX uq_assets_tenant_plate ON app.assets(tenant_id, country_of_plate, plate);

-- Tractor/trailer pairings are time-bounded (PRD §4.3 AssetLink).
CREATE TABLE app.asset_links (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  tractor_asset_id uuid NOT NULL REFERENCES app.assets(id) ON DELETE CASCADE,
  trailer_asset_id uuid NOT NULL REFERENCES app.assets(id) ON DELETE CASCADE,
  valid_from       timestamptz NOT NULL DEFAULT now(),
  valid_to         timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (tractor_asset_id <> trailer_asset_id)
);
CREATE INDEX idx_asset_links_tenant ON app.asset_links(tenant_id);

-- ---------------------------------------------------------------------
-- Gapless document counters (Architecture §4.2)
-- One row per (tenant, doc_type, year). Locked FOR UPDATE on issue.
-- ---------------------------------------------------------------------
CREATE TABLE app.document_counters (
  tenant_id  uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  doc_type   text NOT NULL,
  year       int  NOT NULL,
  value      int  NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, doc_type, year)
);

-- ---------------------------------------------------------------------
-- Hash-chained audit log (Master Blueprint §8)
-- Append-only; one linear chain per tenant ordered by seq.
-- ---------------------------------------------------------------------
CREATE TABLE app.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  seq         bigint NOT NULL,
  actor_id    uuid,
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   text NOT NULL,
  before      jsonb,
  after       jsonb,
  occurred_at timestamptz NOT NULL,
  prev_hash   char(64) NOT NULL,
  hash        char(64) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, seq)
);
CREATE INDEX idx_audit_tenant_seq ON app.audit_log(tenant_id, seq DESC);
-- Block UPDATE/DELETE: the log is append-only.
CREATE RULE audit_no_update AS ON UPDATE TO app.audit_log DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO app.audit_log DO INSTEAD NOTHING;

-- ---------------------------------------------------------------------
-- Transactional outbox (Architecture §1.5, §6)
-- Written in the same tx as the domain change; drained by the worker.
-- ---------------------------------------------------------------------
CREATE TABLE app.outbox (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  event_type     text NOT NULL,          -- e.g. 'customer.created', 'invoice.issued'
  payload        jsonb NOT NULL,
  idempotency_key text NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','processing','done','dead')),
  attempts       int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX idx_outbox_due ON app.outbox(status, next_attempt_at) WHERE status IN ('pending','processing');

-- ---------------------------------------------------------------------
-- AI Gateway provenance (PRD §4.9, Master Blueprint §5)
-- Every AI call is logged; every suggestion records the human decision.
-- ---------------------------------------------------------------------
CREATE TABLE app.ai_interactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  feature          text NOT NULL,           -- 'ocr.delivery_note', 'voice.intake', ...
  user_id          uuid,
  model            text NOT NULL,
  residency_region text NOT NULL,           -- e.g. 'eu'
  input_ref        text,                    -- pointer to stored input (object storage)
  output           jsonb,
  confidence       numeric(5,4),
  latency_ms       int,
  cost_micros      bigint,                  -- cost in millionths of currency unit
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_interactions_tenant ON app.ai_interactions(tenant_id, created_at DESC);

CREATE TABLE app.ai_suggestions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  interaction_id  uuid NOT NULL REFERENCES app.ai_interactions(id) ON DELETE CASCADE,
  target_entity_type text NOT NULL,
  target_entity_id   text,
  suggested_payload  jsonb NOT NULL,
  decision        text NOT NULL DEFAULT 'pending'
                    CHECK (decision IN ('pending','accepted','edited','rejected')),
  decided_by      uuid,
  decided_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_suggestions_tenant ON app.ai_suggestions(tenant_id, created_at DESC);

-- ---------------------------------------------------------------------
-- Per-tenant integration credentials (encrypted at the app layer / KMS).
-- The DB stores ciphertext only (Master Blueprint §8 field-level encryption).
-- ---------------------------------------------------------------------
CREATE TABLE app.integration_credentials (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  provider     text NOT NULL,            -- 'minimax', 'tecdoc', 'einvoice', ...
  config       jsonb NOT NULL DEFAULT '{}'::jsonb, -- non-secret config
  secret_ciphertext text,               -- encrypted secret blob (base64)
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider)
);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_tenants_touch    BEFORE UPDATE ON app.tenants    FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_users_touch      BEFORE UPDATE ON app.users      FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_memberships_touch BEFORE UPDATE ON app.memberships FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_customers_touch  BEFORE UPDATE ON app.customers  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_assets_touch     BEFORE UPDATE ON app.assets     FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_outbox_touch     BEFORE UPDATE ON app.outbox     FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_intcred_touch    BEFORE UPDATE ON app.integration_credentials FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- =====================================================================
-- Row-Level Security. Enabled AND forced on every tenant-scoped table.
-- The application MUST `SET LOCAL app.current_tenant_id = '<uuid>'` per tx.
-- =====================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'memberships','locations','customers','assets','asset_links',
    'document_counters','audit_log','outbox','ai_interactions',
    'ai_suggestions','integration_credentials'
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

-- Least-privilege application role (RLS applies; not a superuser).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'workshop_app') THEN
    CREATE ROLE workshop_app NOLOGIN;
  END IF;
END $$;
GRANT USAGE ON SCHEMA app TO workshop_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA app TO workshop_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO workshop_app;
-- Note: no DELETE granted on audit_log/outbox by design; tenants/users managed by admin role.

COMMIT;
