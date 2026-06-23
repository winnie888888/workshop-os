-- 0032: Per-permission scoping za API ključe (razširitev P2).
--
-- Doslej je ključ nosil samo VLOGE (roles[]); pravice so se izpeljale iz vlog
-- skozi isti RBAC kot ljudje. Ta migracija doda NEOBVEZNO kolono permissions[]:
-- ključ lahko zdaj nosi konkretne pravice namesto (ali poleg) vlog. To omogoča
-- princip najmanjših privilegijev za integracije navzven (npr. ključ, ki sme
-- SAMO brati stranke in ustvariti nalog, ne pa cele vloge).
--
-- ADITIVNO in NAZAJ-ZDRUŽLJIVO: obstoječi ključi imajo permissions = '{}', kar
-- pomeni "presoja izključno po vlogah" — njihovo vedenje se NE spremeni.
-- Validacija (pravica je iz znanega nabora) je v aplikaciji, enako kot pri
-- vlogah. Guard dovoli zahtevek, če pravica izhaja IZ permissions ALI iz vlog.

ALTER TABLE app.api_keys
  ADD COLUMN permissions text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN app.api_keys.permissions IS
  'Neobvezne konkretne pravice ključa (princip najmanjših privilegijev). Prazno = presoja samo po roles[]. Validira aplikacija proti Permission naboru.';

-- Grant ostaja nespremenjen (kolona je del obstoječe tabele, ki jo workshop_app
-- že sme SELECT/INSERT/UPDATE). Brez novih politik: tenant_isolation pokriva vrstico.
