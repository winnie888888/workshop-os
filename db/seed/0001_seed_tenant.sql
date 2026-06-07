-- Seed 0001 — A-SPRINT pilot tenant + owner. Idempotent.
-- Run AFTER migrations. Replace external_subject with the real OIDC sub.
BEGIN;

INSERT INTO app.tenants (id, name, country, default_currency, languages)
VALUES ('00000000-0000-0000-0000-0000000a5b71', 'A-SPRINT d.o.o.', 'SI', 'EUR', ARRAY['sl','en','hr'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO app.users (id, email, name, locale, external_subject)
VALUES ('00000000-0000-0000-0000-0000000a5001', 'owner@a-sprint.si', 'A-SPRINT Owner', 'sl', 'oidc|seed-owner')
ON CONFLICT (id) DO NOTHING;

INSERT INTO app.memberships (tenant_id, user_id, roles, active)
VALUES (
  '00000000-0000-0000-0000-0000000a5b71',
  '00000000-0000-0000-0000-0000000a5001',
  ARRAY['owner','admin'],
  true
)
ON CONFLICT (tenant_id, user_id) DO NOTHING;

INSERT INTO app.locations (tenant_id, name, address, bays)
VALUES ('00000000-0000-0000-0000-0000000a5b71', 'Črnomelj', 'Črnomelj, Slovenia', 4)
ON CONFLICT DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------------
-- Phase 4C: a mechanic so the bay flow works on a fresh seed.
-- The dry run found that assignment and clocking had no valid subject because
-- the only seeded user was the owner. Marko is a real Mehanik membership; his
-- external_subject must be replaced with the IdP `sub` for the actual person.
-- ---------------------------------------------------------------------------
INSERT INTO app.users (id, email, name, locale, external_subject)
VALUES ('00000000-0000-0000-0000-0000000a5002', 'marko.kovac@a-sprint.si', 'Marko Kovač', 'sl', 'oidc|seed-mechanic')
ON CONFLICT (id) DO NOTHING;

INSERT INTO app.memberships (tenant_id, user_id, roles, active)
VALUES (
  '00000000-0000-0000-0000-0000000a5b71',
  '00000000-0000-0000-0000-0000000a5002',
  ARRAY['mechanic'],
  true
)
ON CONFLICT (tenant_id, user_id) DO NOTHING;
