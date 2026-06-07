-- =====================================================================
-- Migration 0002 — Work Orders, Time Tracking, Inventory, Offline Sync
--
-- This migration turns the Phase 1 foundation into a working shop floor. It
-- adds the entities the workshop actually touches every day: fleets that group
-- a customer's vehicles, the work order that replaces the paper "Delovni
-- nalog", the lines and clocked time that hang off it, the parts inventory that
-- those lines draw down, and the append-only change feed that lets the offline
-- bay app reconcile after it reconnects.
--
-- Everything keeps the Phase 1 conventions: tenant_id on every row, RLS enabled
-- AND forced, money as bigint minor units + currency, optimistic version
-- columns for safe concurrent edits, and updated_at triggers.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Fleets — a named grouping of a customer's vehicles. A haulier with 40
-- trucks is one customer with one (or several) fleets; billing, contracts and
-- reminders can target the fleet, which is why it is a first-class entity
-- rather than just a text label on the vehicle.
-- ---------------------------------------------------------------------
CREATE TABLE app.fleets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES app.customers(id) ON DELETE CASCADE,
  name        text NOT NULL,
  cost_center text,                       -- the fleet's PO / cost-center default
  notes       text,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  version     int NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fleets_tenant_customer ON app.fleets(tenant_id, customer_id);

-- Now that fleets exist, point the asset.fleet_id placeholder at them.
ALTER TABLE app.assets
  ADD CONSTRAINT fk_assets_fleet FOREIGN KEY (fleet_id)
  REFERENCES app.fleets(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- Work Orders — the digital Delovni nalog. The header carries everything the
-- paper form did (who, which vehicle, the complaint, mileage, the responsible
-- advisor and assigned mechanic) plus the status that the state machine in the
-- shared core governs. Money totals are denormalized for fast reads but are
-- always recomputable from the lines (the lines are the source of truth).
-- ---------------------------------------------------------------------
CREATE TABLE app.work_orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  number           text,                    -- WO-2026-000123, assigned via counter
  location_id      uuid REFERENCES app.locations(id) ON DELETE SET NULL,
  customer_id      uuid NOT NULL REFERENCES app.customers(id) ON DELETE RESTRICT,
  asset_id         uuid REFERENCES app.assets(id) ON DELETE RESTRICT,
  fleet_id         uuid REFERENCES app.fleets(id) ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'draft',  -- validated by shared state machine
  complaint        text,                    -- customer's reported problem
  diagnosis        text,                    -- mechanic's findings
  odometer         int,
  engine_hours     int,
  advisor_id       uuid REFERENCES app.users(id) ON DELETE SET NULL,
  assigned_mechanic_id uuid REFERENCES app.users(id) ON DELETE SET NULL,
  currency         char(3) NOT NULL DEFAULT 'EUR',
  customer_po      text,                    -- the customer's purchase-order ref
  -- denormalized totals in minor units (recomputed from lines on each change)
  total_net_minor   bigint NOT NULL DEFAULT 0,
  total_vat_minor   bigint NOT NULL DEFAULT 0,
  total_gross_minor bigint NOT NULL DEFAULT 0,
  opened_at        timestamptz,
  ready_at         timestamptz,
  invoiced_at      timestamptz,
  closed_at        timestamptz,
  version          int NOT NULL DEFAULT 1,   -- optimistic lock for concurrent edits
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid,
  updated_by       uuid
);
CREATE INDEX idx_work_orders_tenant_status ON app.work_orders(tenant_id, status);
CREATE INDEX idx_work_orders_tenant_customer ON app.work_orders(tenant_id, customer_id);
CREATE INDEX idx_work_orders_tenant_asset ON app.work_orders(tenant_id, asset_id);
CREATE UNIQUE INDEX uq_work_orders_number ON app.work_orders(tenant_id, number) WHERE number IS NOT NULL;

-- ---------------------------------------------------------------------
-- Work Order Lines — labour, parts, sublet, kits, fees, cores, discounts.
-- Each line stores its priced figures (computed by the shared Pricing module)
-- so the work order total is just a sum, and so a historical line keeps the
-- price it was billed at even if catalogue prices change later.
-- ---------------------------------------------------------------------
CREATE TABLE app.work_order_lines (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  work_order_id    uuid NOT NULL REFERENCES app.work_orders(id) ON DELETE CASCADE,
  line_no          int NOT NULL,
  type             text NOT NULL CHECK (type IN ('labour','part','sublet','kit','fee','core','discount')),
  description      text NOT NULL,
  inventory_item_id uuid,                   -- set for part lines; FK added below
  quantity         numeric(12,3) NOT NULL DEFAULT 1,
  unit_price_minor bigint NOT NULL DEFAULT 0,
  discount_pct     numeric(5,2) NOT NULL DEFAULT 0,
  vat_rate_pct     numeric(5,2) NOT NULL DEFAULT 22,
  -- priced figures in minor units, written by the application from shared Pricing
  net_minor        bigint NOT NULL DEFAULT 0,
  vat_minor        bigint NOT NULL DEFAULT 0,
  gross_minor      bigint NOT NULL DEFAULT 0,
  issued           boolean NOT NULL DEFAULT false,  -- part physically fitted (stock issued)
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_order_id, line_no)
);
CREATE INDEX idx_wol_tenant_wo ON app.work_order_lines(tenant_id, work_order_id);

-- ---------------------------------------------------------------------
-- Time Entries — one continuous clocked stretch of a mechanic on a work order.
-- The partial unique index enforces the headline rule from the shared core at
-- the database level too: a mechanic may have at most ONE open entry at a time.
-- Defence in depth — the application checks it, and so does Postgres.
-- ---------------------------------------------------------------------
CREATE TABLE app.time_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES app.work_orders(id) ON DELETE CASCADE,
  mechanic_id   uuid NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
  started_at    timestamptz NOT NULL,
  ended_at      timestamptz,
  duration_seconds int,                     -- filled on clock-out
  cost_minor    bigint,                     -- labour cost at clock-out (shared TimeTracking)
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX idx_time_entries_tenant_wo ON app.time_entries(tenant_id, work_order_id);
-- At most one OPEN entry per mechanic per tenant.
CREATE UNIQUE INDEX uq_one_open_entry_per_mechanic
  ON app.time_entries(tenant_id, mechanic_id) WHERE ended_at IS NULL;

-- ---------------------------------------------------------------------
-- Inventory — items (the catalogue) and per-location stock levels, plus an
-- append-only movement ledger. The shared Inventory reducer decides the new
-- on_hand/reserved; this schema persists the result and the audit trail of how
-- it got there. The (on_hand, reserved) invariants are also asserted by CHECKs.
-- ---------------------------------------------------------------------
CREATE TABLE app.inventory_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  sku           text,
  oem_ref       text,
  name          text NOT NULL,
  unit          text NOT NULL DEFAULT 'pcs',
  cost_minor    bigint NOT NULL DEFAULT 0,    -- last purchase cost
  price_minor   bigint NOT NULL DEFAULT 0,    -- default sell price
  currency      char(3) NOT NULL DEFAULT 'EUR',
  vat_rate_pct  numeric(5,2) NOT NULL DEFAULT 22,
  is_core       boolean NOT NULL DEFAULT false,
  minimax_article_id text,
  version       int NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inv_items_tenant_name ON app.inventory_items(tenant_id, lower(name));
CREATE UNIQUE INDEX uq_inv_items_tenant_sku ON app.inventory_items(tenant_id, sku) WHERE sku IS NOT NULL;

CREATE TABLE app.stock_levels (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  item_id      uuid NOT NULL REFERENCES app.inventory_items(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL REFERENCES app.locations(id) ON DELETE CASCADE,
  on_hand      int NOT NULL DEFAULT 0,
  reserved     int NOT NULL DEFAULT 0,
  reorder_point int NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, item_id, location_id),
  CHECK (on_hand >= 0),
  CHECK (reserved >= 0),
  CHECK (reserved <= on_hand)
);
CREATE INDEX idx_stock_levels_tenant_item ON app.stock_levels(tenant_id, item_id);

CREATE TABLE app.stock_movements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  item_id       uuid NOT NULL REFERENCES app.inventory_items(id) ON DELETE RESTRICT,
  location_id   uuid NOT NULL REFERENCES app.locations(id) ON DELETE RESTRICT,
  type          text NOT NULL CHECK (type IN ('receive','reserve','issue','release','adjust')),
  quantity      int NOT NULL,
  work_order_line_id uuid REFERENCES app.work_order_lines(id) ON DELETE SET NULL,
  reason        text,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_moves_tenant_item ON app.stock_movements(tenant_id, item_id, created_at DESC);
-- Movements are an immutable ledger.
CREATE RULE stock_moves_no_update AS ON UPDATE TO app.stock_movements DO INSTEAD NOTHING;
CREATE RULE stock_moves_no_delete AS ON DELETE TO app.stock_movements DO INSTEAD NOTHING;

-- Now that inventory_items exists, link part lines to the catalogue.
ALTER TABLE app.work_order_lines
  ADD CONSTRAINT fk_wol_item FOREIGN KEY (inventory_item_id)
  REFERENCES app.inventory_items(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- Offline change feed — the backbone of the offline-first bay app
-- (Master Blueprint §14). Every server-side change to a syncable entity appends
-- a row here with a monotonically increasing cursor. A device that has been
-- offline pulls "everything since my last cursor" to catch up. Unlike invoice
-- numbering, gaps here are harmless, so a plain bigserial is the right tool.
--
-- Going the other way, the device replays its queued mutations; each carries a
-- client-generated UUID and an idempotency key so replays are safe, and the
-- entity's `version` column detects conflicting edits (last-writer-loses on a
-- stale version -> the client is told to refetch and merge).
-- ---------------------------------------------------------------------
CREATE TABLE app.change_feed (
  cursor      bigserial PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  entity_type text NOT NULL,               -- 'work_order', 'work_order_line', 'time_entry'
  entity_id   uuid NOT NULL,
  op          text NOT NULL CHECK (op IN ('upsert','delete')),
  version     int NOT NULL,
  payload     jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_change_feed_tenant_cursor ON app.change_feed(tenant_id, cursor);

-- Tracks each device's processed client mutations for idempotent replay.
CREATE TABLE app.sync_mutations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  device_id       text NOT NULL,
  idempotency_key text NOT NULL,
  result          jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, device_id, idempotency_key)
);

-- ---------------------------------------------------------------------
-- updated_at triggers for the new mutable tables
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_fleets_touch      BEFORE UPDATE ON app.fleets           FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_wo_touch          BEFORE UPDATE ON app.work_orders      FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_wol_touch         BEFORE UPDATE ON app.work_order_lines FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_te_touch          BEFORE UPDATE ON app.time_entries     FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_inv_items_touch   BEFORE UPDATE ON app.inventory_items  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_stock_levels_touch BEFORE UPDATE ON app.stock_levels    FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- =====================================================================
-- Row-Level Security on all new tenant-scoped tables (enabled AND forced).
-- =====================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fleets','work_orders','work_order_lines','time_entries',
    'inventory_items','stock_levels','stock_movements',
    'change_feed','sync_mutations'
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

-- Grant the least-privilege runtime role access to the new tables.
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA app TO workshop_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO workshop_app;  -- change_feed.cursor

COMMIT;
