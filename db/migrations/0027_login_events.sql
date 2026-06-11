-- 0027: Zgodovina prijav (Pravice uporabnikov, P3).
--
-- GLOBALNA tabela (brez RLS) po vzoru app.user_sessions: prijava je lastnost
-- uporabnika, ne najemnika — isti človek lahko pripada več delavnicam, neuspel
-- poskus pa sploh nima znanega uporabnika. Branje teče v admin obsegu in se
-- filtrira po članstvu (owner vidi dogodke SVOJIH članov + dogodke svojih
-- API ključev), pisanje pa samo iz auth poti v API-ju.
--
-- Viri dogodkov:
--   oidc_session  nova naprava/seja ob heartbeatu (OIDC ali lokalna prijava)
--   api_key       uspešna raba ključa (dušeno ~60 s) ali zavrnjen ključ
--   logout        ročna odjava naprave
--   local         preverjanje gesla na /public/login (P3b — SignupModule)

CREATE TABLE app.login_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES app.users(id) ON DELETE SET NULL,
  tenant_id       uuid REFERENCES app.tenants(id) ON DELETE SET NULL, -- znan pri api_key
  email_attempted text,            -- neuspela lokalna prijava: vpisani e-naslov
  method          text NOT NULL CHECK (method IN ('local','oidc_session','api_key','logout')),
  success         boolean NOT NULL,
  ip              text,
  user_agent      text,
  detail          text,            -- npr. 'invalid_or_revoked_key', prefix ključa
  at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_events_user ON app.login_events (user_id, at DESC);
CREATE INDEX idx_login_events_tenant ON app.login_events (tenant_id, at DESC);
CREATE INDEX idx_login_events_at ON app.login_events (at DESC);

GRANT SELECT, INSERT ON app.login_events TO workshop_app;
