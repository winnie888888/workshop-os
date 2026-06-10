-- =============================================================================
-- 0018 — Self-serve signup: lastne poverilnice, verifikacijski žetoni, trial
-- =============================================================================
-- Produktizacija Faza A (docs/P3-PRODUKTIZACIJA.md §5–6). Tri kosi:
--
--   1. app.tenants dobi komercialno stanje (plan / billing_status /
--      trial_ends_at). Provisioning ustvari 'trial'+'trialing' za 14 dni;
--      Faza B (Stripe webhooki) ta polja premika naprej.
--   2. app.user_credentials — geslo za GLOBALNEGA uporabnika (app.users je
--      že globalen: email citext UNIQUE). OIDC pot ostane nedotaknjena;
--      lastna prijava je le še en način, da uporabnik dokaže external_subject
--      ('local|<user_id>', glej auth/token-verifier.ts).
--   3. app.signup_tokens — ČAKAJOČE registracije. Tenant in user NE
--      obstajata, dokler e-mail ni potrjen; do takrat živi vse (ime delavnice,
--      scrypt hash gesla) v payload-u žetona. Žeton hranimo IZKLJUČNO kot
--      sha256 — uhajanje baze ne razkrije delujočih povezav.
--
-- VARNOSTNI REŽIM teh dveh tabel: sta GLOBALNI (brez tenant_id) in se bereta
-- samo prek PgService.withAdmin pred avtentikacijo. Za aplikacijsko vlogo
-- (workshop_app) sta zaklenjeni z ENABLE+FORCE RLS BREZ politike (= deny-all),
-- kar preživi tudi morebitne prihodnje pavšalne GRANT-e; admin povezava (pool
-- user, lastnik sheme) RLS obide po zasnovi.
-- =============================================================================

-- --- 1. Komercialno stanje tenanta -------------------------------------------
ALTER TABLE app.tenants ADD COLUMN plan text NOT NULL DEFAULT 'founders'
  CHECK (plan IN ('trial','start','delavnica','flota','founders'));
ALTER TABLE app.tenants ADD COLUMN billing_status text NOT NULL DEFAULT 'active'
  CHECK (billing_status IN ('trialing','active','past_due','suspended','cancelled'));
ALTER TABLE app.tenants ADD COLUMN trial_ends_at timestamptz;
-- Obstoječi (ročno ustvarjeni) tenanti — vključno z A-SPRINT — dobijo
-- 'founders'/'active' prek DEFAULT zgoraj: nič se jim ne spremeni.

-- --- 2. Poverilnice (globalno, admin-only) ------------------------------------
CREATE TABLE app.user_credentials (
  user_id           uuid PRIMARY KEY REFERENCES app.users(id) ON DELETE CASCADE,
  password_hash     text NOT NULL,            -- scrypt$N$r$p$salt$hash (auth/password.util.ts)
  email_verified_at timestamptz,
  failed_attempts   int NOT NULL DEFAULT 0,
  locked_until      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_user_credentials_touch BEFORE UPDATE ON app.user_credentials
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- --- 3. Čakajoče registracije (globalno, admin-only) --------------------------
CREATE TABLE app.signup_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       citext NOT NULL,
  token_hash  char(64) NOT NULL UNIQUE,       -- sha256(hex) surovega žetona
  purpose     text NOT NULL DEFAULT 'signup' CHECK (purpose IN ('signup','password_reset')),
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_signup_tokens_email ON app.signup_tokens(email) WHERE used_at IS NULL;

-- --- Deny-all za aplikacijsko vlogo -------------------------------------------
ALTER TABLE app.user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.user_credentials FORCE  ROW LEVEL SECURITY;
ALTER TABLE app.signup_tokens    ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.signup_tokens    FORCE  ROW LEVEL SECURITY;
-- (namenoma BREZ CREATE POLICY: brez politike = nobena vrstica za workshop_app)
REVOKE ALL ON app.user_credentials FROM workshop_app;
REVOKE ALL ON app.signup_tokens    FROM workshop_app;
