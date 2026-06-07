-- =============================================================================
-- 0013 — Employee Time & Attendance (Phase 9)
-- =============================================================================
-- Slovenian working-time evidence, kept DELIBERATELY SEPARATE from work-order
-- time tracking (work_order_time_entries). Attendance answers "was the person
-- present, for how long, net of breaks" (payroll + ZDR-1/ZEPDSV evidence); work-
-- order time answers "how long did this job take" (pricing). The same hour may
-- appear in both — that is two ledgers, not double counting. The only place they
-- meet is the consistency check, which RECONCILES and FLAGS, never edits.
--
-- The employee identity is the user_id (a tenant membership). All money is in
-- minor units (bigint). All tables carry tenant_id and inherit forced RLS via
-- the block at the end. Corrections are audited through the hash-chain audit log.
-- =============================================================================

-- One row per employee per working day. Raw clock times are kept; everything
-- else (net worked, flags) is derived by the shared core, so corrections stay
-- transparent and reproducible.
CREATE TABLE app.attendance_days (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
  work_date       date NOT NULL,
  clock_in_at     timestamptz,
  clock_out_at    timestamptz,
  -- Audited manual correction provenance (null unless corrected).
  corrected_by    uuid REFERENCES app.users(id) ON DELETE SET NULL,
  corrected_at    timestamptz,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, work_date)
);
CREATE INDEX idx_attendance_days_user ON app.attendance_days(tenant_id, user_id, work_date DESC);

-- Breaks within a day (a day may have several). end_at null = break still open.
CREATE TABLE app.attendance_breaks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  attendance_day_id uuid NOT NULL REFERENCES app.attendance_days(id) ON DELETE CASCADE,
  start_at          timestamptz NOT NULL,
  end_at            timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_attendance_breaks_day ON app.attendance_breaks(tenant_id, attendance_day_id);

-- Leave requests (vacation, sick, personal, business, public holiday, planned).
CREATE TABLE app.leave_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
  leave_type   text NOT NULL CHECK (leave_type IN
                 ('vacation','sick_leave','personal_leave','business_leave','public_holiday','planned_absence')),
  start_date   date NOT NULL,
  end_date     date NOT NULL,
  -- Hours a full leave day contributes to the timesheet (usually 8).
  hours_per_day numeric NOT NULL DEFAULT 8,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected','cancelled')),
  reason       text,
  decided_by   uuid REFERENCES app.users(id) ON DELETE SET NULL,
  decided_at   timestamptz,
  decision_note text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
CREATE INDEX idx_leave_requests_user ON app.leave_requests(tenant_id, user_id, start_date DESC);
CREATE INDEX idx_leave_requests_status ON app.leave_requests(tenant_id, status);

-- Company service vehicles — the workshop's OWN vans/tow trucks, distinct from
-- customer vehicles (app.assets). Assigned to a driver/mechanic/operator.
CREATE TABLE app.service_vehicles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  registration_number text NOT NULL,
  vin                 text,
  make                text,
  model               text,
  fuel_type           text,
  current_mileage_km  integer NOT NULL DEFAULT 0,
  assigned_user_id    uuid REFERENCES app.users(id) ON DELETE SET NULL,
  insurance_note      text,
  registration_expiry date,
  status              text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','maintenance','retired')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_vehicles_tenant ON app.service_vehicles(tenant_id, status);

-- Travel orders (potni nalog). Gapless number assigned on creation. Times are
-- stored as seconds (categorised) plus the start/end window; money in minor.
CREATE TABLE app.travel_orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  number             text,
  user_id            uuid NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
  service_vehicle_id uuid REFERENCES app.service_vehicles(id) ON DELETE SET NULL,
  customer_id        uuid REFERENCES app.customers(id) ON DELETE SET NULL,
  work_order_id      uuid REFERENCES app.work_orders(id) ON DELETE SET NULL,
  purpose            text NOT NULL CHECK (purpose IN
                       ('field_repair','field_repair_abroad','road_assistance','towing','parts_pickup','customer_visit')),
  destination        text,
  country            text,
  started_at         timestamptz,
  ended_at           timestamptz,
  travel_seconds     integer NOT NULL DEFAULT 0,
  work_seconds       integer NOT NULL DEFAULT 0,
  waiting_seconds    integer NOT NULL DEFAULT 0,
  km                 numeric NOT NULL DEFAULT 0,
  per_km_rate_minor  integer NOT NULL DEFAULT 0,
  expenses_minor     integer NOT NULL DEFAULT 0,
  currency           text NOT NULL DEFAULT 'EUR',
  status             text NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','in_progress','completed','exported','cancelled')),
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_travel_orders_user ON app.travel_orders(tenant_id, user_id, created_at DESC);
CREATE INDEX idx_travel_orders_status ON app.travel_orders(tenant_id, status);

-- Field-service / road-assistance events — lighter recording than a travel
-- order (may have no vehicle/mileage), but feeds the consistency check too.
CREATE TABLE app.field_service_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
  customer_id     uuid REFERENCES app.customers(id) ON DELETE SET NULL,
  kind            text NOT NULL CHECK (kind IN
                    ('field_repair','road_assistance','mobile_service','towing','customer_visit','parts_collection')),
  location        text,
  country         text,
  started_at      timestamptz,
  ended_at        timestamptz,
  travel_seconds  integer NOT NULL DEFAULT 0,
  work_seconds    integer NOT NULL DEFAULT 0,
  waiting_seconds integer NOT NULL DEFAULT 0,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_field_service_user ON app.field_service_events(tenant_id, user_id, started_at DESC);

-- Touch triggers.
CREATE TRIGGER trg_attendance_days_touch    BEFORE UPDATE ON app.attendance_days    FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_attendance_breaks_touch  BEFORE UPDATE ON app.attendance_breaks  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_leave_requests_touch     BEFORE UPDATE ON app.leave_requests     FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_service_vehicles_touch   BEFORE UPDATE ON app.service_vehicles   FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_travel_orders_touch      BEFORE UPDATE ON app.travel_orders      FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_field_service_touch      BEFORE UPDATE ON app.field_service_events FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- Forced tenant RLS on all six new tables.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'attendance_days','attendance_breaks','leave_requests',
    'service_vehicles','travel_orders','field_service_events'
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
