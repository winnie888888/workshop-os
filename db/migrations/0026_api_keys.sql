-- 0026: API ključi (Pravice uporabnikov, P2).
--
-- Ključ se v bazi NIKOLI ne hrani v čisti obliki: hranimo sha256 hash in
-- prikazni prefix (wos_xxxxxxxx). Polni ključ se uporabniku pokaže natanko
-- enkrat, ob ustvarjanju. Ključ nosi VLOGE (podmnožico, validira aplikacija;
-- owner/admin sta prepovedana), zato gre avtentikacija skozi isti RBAC guard
-- kot človeški uporabniki. Preklic je takojšen (revoked_at).
--
-- Iskanje ob avtentikaciji teče v admin obsegu (tenant izhaja IZ ključa),
-- enako kot razrešitev članstva v auth-tenant middlewaru; zato unikatni
-- indeks na key_hash.

CREATE TABLE app.api_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  name         text NOT NULL,
  prefix       text NOT NULL,                -- prikaz: wos_ab12cd34
  key_hash     text NOT NULL,                -- sha256(hex) polnega ključa
  roles        text[] NOT NULL DEFAULT '{}', -- validira aplikacija (brez owner/admin)
  created_by   uuid REFERENCES app.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at   timestamptz,
  revoked_by   uuid REFERENCES app.users(id)
);

CREATE UNIQUE INDEX idx_api_keys_hash ON app.api_keys (key_hash);
CREATE INDEX idx_api_keys_tenant ON app.api_keys (tenant_id, created_at DESC);

ALTER TABLE app.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.api_keys FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON app.api_keys
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON app.api_keys TO workshop_app;
