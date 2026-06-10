-- =============================================================================
-- 0020 — Plačilni profil delavnice (UPN QR prejemnik)
-- =============================================================================
-- Plačila P1. UPN QR na računu/predračunu potrebuje prejemnikova polja 15 in
-- 17–19 (IBAN, naziv, ulica, kraj). Naziv že imamo (tenants.name), naslova in
-- IBAN pa ne — dodamo jih na app.tenants. Isti podatki bodo kasneje služili
-- tudi kot prodajalec v e-SLOG izvozu in na glavi PDF računa.
--
-- RLS: app.tenants ostane brez grantov za workshop_app (admin-only tabela);
-- branje/pisanje teče izključno prek withAdmin v TenantModule, kjer se
-- tenant_id vzame iz overjenega konteksta — enak vzorec kot GDPR export.
-- =============================================================================

ALTER TABLE app.tenants
  ADD COLUMN IF NOT EXISTS iban      text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS address   text,
  ADD COLUMN IF NOT EXISTS post_code text,
  ADD COLUMN IF NOT EXISTS city      text;

COMMENT ON COLUMN app.tenants.iban      IS 'TRR delavnice za UPN QR (prejemnikov IBAN, polje 15).';
COMMENT ON COLUMN app.tenants.bank_name IS 'Naziv banke (informativno, prikaz na računu).';
COMMENT ON COLUMN app.tenants.address   IS 'Ulica in hišna številka (UPN QR polje 18, e-SLOG prodajalec).';
COMMENT ON COLUMN app.tenants.post_code IS 'Poštna številka (del UPN QR polja 19).';
COMMENT ON COLUMN app.tenants.city      IS 'Kraj (del UPN QR polja 19).';
