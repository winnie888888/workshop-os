-- =============================================================================
-- 0019 — Obvestila v aplikaciji (zvonček) + servisni paketi (presets)
-- =============================================================================
-- Sprint 3. Dve tenant-scoped tabeli po ustaljenem RLS vzorcu (0017):
--
--   1. app.notifications — PER-PREJEMNIK vrstice (fan-out ob pisanju prek
--      NotifyService/withAdmin, ker memberships nima granta za workshop_app).
--      Branje/označevanje teče v tenant transakciji kot vse ostalo. Zvonček v
--      webu že ima končni kontrakt: {id,kind,title,body?,entityType,entityId,
--      read,createdAt}.
--   2. app.presets — paketi dela+delov za en-klik vnos na delovni nalog.
--      Vrstice paketa so jsonb (kataloški itemId + qty + cena ob zajemu);
--      ujema demo obliko, ki jo 3 warehouse strani že uporabljajo.
--
-- Grant je EKSPLICITEN na novi tabeli (NE pavšalni "ALL TABLES" — 0018 je
-- globalne auth tabele zaklenil s FORCE RLS in jih pavšal ne sme ponovno
-- odpreti niti pomotoma).
-- =============================================================================

CREATE TABLE app.notifications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  recipient_user_id  uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  kind               text NOT NULL,
  title              text NOT NULL,
  body               text,
  entity_type        text,
  entity_id          uuid,
  read_at            timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_recipient
  ON app.notifications(tenant_id, recipient_user_id, created_at DESC);

CREATE TABLE app.presets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  vehicle_classes text[] NOT NULL DEFAULT '{}',
  powertrains     text[] NOT NULL DEFAULT '{}',
  lines           jsonb NOT NULL DEFAULT '[]'::jsonb,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_presets_tenant ON app.presets(tenant_id, active);
CREATE TRIGGER trg_presets_touch BEFORE UPDATE ON app.presets
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

ALTER TABLE app.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.notifications FORCE  ROW LEVEL SECURITY;
ALTER TABLE app.presets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.presets       FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON app.notifications
  USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY tenant_isolation ON app.presets
  USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

-- Obvestil aplikacija ne briše (samo read_at); paketi so polno upravljani.
GRANT SELECT, INSERT, UPDATE ON app.notifications TO workshop_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.presets TO workshop_app;
