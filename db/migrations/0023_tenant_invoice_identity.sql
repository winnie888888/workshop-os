-- =============================================================================
-- 0023 — Identiteta podjetja za uradne dokumente (Minimax-enak račun)
-- =============================================================================
-- Tiskani račun mora nositi VSE podatke kot obstoječi Minimax računi delavnice:
-- kontakte (tel/faks/e-pošta/splet), oba TRR z BIC ter registracijsko nogo
-- (sodišče, osnovni kapital, matična). Vse neobvezno; vpiše se enkrat v
-- Nastavitve → Podatki podjetja in plačil. Admin domena (brez grantov), kot 0020.
-- =============================================================================

ALTER TABLE app.tenants
  ADD COLUMN IF NOT EXISTS phone             text,
  ADD COLUMN IF NOT EXISTS fax               text,
  ADD COLUMN IF NOT EXISTS email             text,
  ADD COLUMN IF NOT EXISTS website           text,
  ADD COLUMN IF NOT EXISTS bic               text,
  ADD COLUMN IF NOT EXISTS iban2             text,
  ADD COLUMN IF NOT EXISTS bic2              text,
  ADD COLUMN IF NOT EXISTS registration_note text;

COMMENT ON COLUMN app.tenants.registration_note IS 'Noga računa: registracija družbe, osnovni kapital, matična št. — prosto besedilo, izpiše se na dnu vsakega računa.';
