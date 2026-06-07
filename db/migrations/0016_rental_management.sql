-- =============================================================================
-- 0016 — Vehicle rental management (Phase 12)
-- =============================================================================
-- A complete rental fleet that the workshop rents OUT to customers: motorhomes,
-- passenger cars, replacement vehicles, and service vehicles. This is distinct
-- from app.assets (customers' own vehicles we service) and from
-- app.service_vehicles (our own fleet used for field service/travel orders).
--
-- The relationships make rental one connected system: a rental_vehicle is booked
-- by a rental_reservation for a customer over a date range; a rental_contract is
-- created from a reservation and carries every agreed term and every handover/
-- return reading; rental_damages hang off a contract with their photos. The
-- final invoice is a normal app.invoices row (issued through the existing engine)
-- referenced from the contract, so rental billing flows through Minimax and
-- e-invoicing like any other invoice.
--
-- Forced tenant RLS and touch triggers throughout, as everywhere in the system.
-- =============================================================================

-- --- Rental fleet ----------------------------------------------------------
CREATE TABLE app.rental_vehicles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  category            text NOT NULL DEFAULT 'car'
                        CHECK (category IN ('motorhome','car','replacement','service','van','other')),
  make                text,
  model               text,
  plate               text NOT NULL,
  vin                 text,
  year                int,
  -- Default commercial terms (a contract copies these so changing the fleet
  -- default never rewrites history on an existing contract).
  daily_rate_minor    bigint NOT NULL DEFAULT 0,
  included_km_per_day int NOT NULL DEFAULT 0,
  per_km_rate_minor   bigint NOT NULL DEFAULT 0,
  per_fuel_eighth_minor bigint NOT NULL DEFAULT 0,
  cleaning_fee_minor  bigint NOT NULL DEFAULT 0,
  late_fee_per_day_minor bigint NOT NULL DEFAULT 0,
  deposit_minor       bigint NOT NULL DEFAULT 0,
  deductible_minor    bigint NOT NULL DEFAULT 0,
  fuel_tank_eighths   int NOT NULL DEFAULT 8,
  currency            text NOT NULL DEFAULT 'EUR',
  current_mileage_km  int NOT NULL DEFAULT 0,
  current_fuel_eighths int NOT NULL DEFAULT 8,
  status              text NOT NULL DEFAULT 'available'
                        CHECK (status IN ('available','rented','maintenance','retired')),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rental_vehicles_tenant ON app.rental_vehicles(tenant_id, status);

-- --- Reservations (the availability calendar) ------------------------------
CREATE TABLE app.rental_reservations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  rental_vehicle_id uuid NOT NULL REFERENCES app.rental_vehicles(id) ON DELETE RESTRICT,
  customer_id     uuid NOT NULL REFERENCES app.customers(id) ON DELETE RESTRICT,
  start_at        timestamptz NOT NULL,
  end_at          timestamptz NOT NULL,
  pickup_location text,
  return_location text,
  status          text NOT NULL DEFAULT 'reserved'
                    CHECK (status IN ('reserved','confirmed','active','completed','cancelled')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);
CREATE INDEX idx_rental_res_tenant_vehicle ON app.rental_reservations(tenant_id, rental_vehicle_id, start_at);
CREATE INDEX idx_rental_res_tenant_status  ON app.rental_reservations(tenant_id, status);

-- --- Contracts (the legal agreement + readings) ----------------------------
CREATE TABLE app.rental_contracts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  number             text NOT NULL,
  reservation_id     uuid REFERENCES app.rental_reservations(id) ON DELETE SET NULL,
  rental_vehicle_id  uuid NOT NULL REFERENCES app.rental_vehicles(id) ON DELETE RESTRICT,
  customer_id        uuid NOT NULL REFERENCES app.customers(id) ON DELETE RESTRICT,
  start_at           timestamptz NOT NULL,
  end_at             timestamptz NOT NULL,
  pickup_location    text,
  return_location    text,
  -- Terms COPIED from the vehicle at contract creation (history-stable).
  daily_rate_minor    bigint NOT NULL DEFAULT 0,
  included_km_per_day int NOT NULL DEFAULT 0,
  per_km_rate_minor   bigint NOT NULL DEFAULT 0,
  per_fuel_eighth_minor bigint NOT NULL DEFAULT 0,
  cleaning_fee_minor  bigint NOT NULL DEFAULT 0,
  late_fee_per_day_minor bigint NOT NULL DEFAULT 0,
  deposit_minor       bigint NOT NULL DEFAULT 0,
  deductible_minor    bigint NOT NULL DEFAULT 0,
  casco               boolean NOT NULL DEFAULT false,
  fuel_policy         text NOT NULL DEFAULT 'full_to_full',
  mileage_policy      text,
  late_policy         text,
  currency            text NOT NULL DEFAULT 'EUR',
  -- Handover readings (filled at handover).
  start_mileage_km    int,
  start_fuel_eighths  int,
  handover_at         timestamptz,
  handover_signature_attachment_id uuid REFERENCES app.attachments(id) ON DELETE SET NULL,
  -- Return readings (filled at return).
  return_mileage_km   int,
  return_fuel_eighths int,
  returned_dirty      boolean NOT NULL DEFAULT false,
  return_at           timestamptz,
  return_signature_attachment_id uuid REFERENCES app.attachments(id) ON DELETE SET NULL,
  -- Outcome.
  charges             jsonb,         -- the computed RentalChargeResult at return
  invoice_id          uuid REFERENCES app.invoices(id) ON DELETE SET NULL,
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','handed_over','returned','invoiced','cancelled')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at),
  UNIQUE (tenant_id, number)
);
CREATE INDEX idx_rental_contracts_tenant_status ON app.rental_contracts(tenant_id, status);
CREATE INDEX idx_rental_contracts_tenant_vehicle ON app.rental_contracts(tenant_id, rental_vehicle_id);

-- --- Damage records (with photos) ------------------------------------------
CREATE TABLE app.rental_damages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  contract_id   uuid NOT NULL REFERENCES app.rental_contracts(id) ON DELETE CASCADE,
  recorded_at_stage text NOT NULL DEFAULT 'return'
                    CHECK (recorded_at_stage IN ('handover','return')),
  description   text NOT NULL,
  severity      text NOT NULL DEFAULT 'minor'
                    CHECK (severity IN ('minor','moderate','major')),
  estimated_cost_minor bigint NOT NULL DEFAULT 0,
  photo_attachment_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rental_damages_tenant_contract ON app.rental_damages(tenant_id, contract_id);

-- --- Touch triggers --------------------------------------------------------
CREATE TRIGGER trg_rental_vehicles_touch     BEFORE UPDATE ON app.rental_vehicles     FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_rental_reservations_touch BEFORE UPDATE ON app.rental_reservations FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_rental_contracts_touch    BEFORE UPDATE ON app.rental_contracts    FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_rental_damages_touch      BEFORE UPDATE ON app.rental_damages      FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- --- Forced tenant RLS on every table --------------------------------------
ALTER TABLE app.rental_vehicles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.rental_vehicles     FORCE ROW LEVEL SECURITY;
ALTER TABLE app.rental_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.rental_reservations FORCE ROW LEVEL SECURITY;
ALTER TABLE app.rental_contracts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.rental_contracts    FORCE ROW LEVEL SECURITY;
ALTER TABLE app.rental_damages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.rental_damages      FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON app.rental_vehicles
  USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY tenant_isolation ON app.rental_reservations
  USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY tenant_isolation ON app.rental_contracts
  USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY tenant_isolation ON app.rental_damages
  USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA app TO workshop_app;
