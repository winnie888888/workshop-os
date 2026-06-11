-- 0025: Pravice uporabnikov (P1) — ročne izjeme pravic po članu.
--
-- Vloge (app.memberships.roles) ostanejo OSNOVA pravic prek testirane matrike
-- v @workshop/shared/roles. Ta tabela hrani izjeme za posameznega člana:
--   allow = true   pravica je dodana mimo vlog,
--   allow = false  pravica je odvzeta kljub vlogi (deny zmaga nad vsem).
-- Efektivne pravice = (pravice vlog ∪ allow) − deny; izračun je čista,
-- testirana funkcija effectivePermissionsFor v shared jedru. Vrednosti
-- stolpca permission validira aplikacija (isValidPermission) — namerno brez
-- CHECK seznama, da nova pravica v kodi ne zahteva migracije.
--
-- Spremembe izvaja samo API (Permission.TenantManage) in vsaka gre v
-- revizijsko verigo (audit_log, action 'member.permissions_updated').

CREATE TABLE app.member_permission_overrides (
  tenant_id  uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES app.users(id)   ON DELETE CASCADE,
  permission text NOT NULL,
  allow      boolean NOT NULL,
  created_by uuid REFERENCES app.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id, permission)
);

CREATE INDEX idx_perm_overrides_user
  ON app.member_permission_overrides (tenant_id, user_id);

-- RLS po konvenciji iz 0001 (enabled + forced + tenant_isolation).
ALTER TABLE app.member_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.member_permission_overrides FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON app.member_permission_overrides
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON app.member_permission_overrides TO workshop_app;
