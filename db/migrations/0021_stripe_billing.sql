-- =============================================================================
-- 0021 — Stripe vezava naročnine (Faza B, blok 2)
-- =============================================================================
-- Webhooki potrebujejo preslikavo Stripe ↔ tenant v OBE smeri:
--  - checkout.session.completed nosi client_reference_id = tenant_id in nam da
--    customer + subscription id (shranimo ju tukaj),
--  - kasnejši dogodki (invoice.paid, subscription.updated/deleted) nosijo samo
--    Stripe id-je → tenanta najdemo prek teh stolpcev.
-- Tabela ostaja admin domena (brez grantov za workshop_app); piše izključno
-- webhook prek withAdmin.
-- =============================================================================

ALTER TABLE app.tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_stripe_customer_uq
  ON app.tenants (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tenants_stripe_subscription_uq
  ON app.tenants (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

COMMENT ON COLUMN app.tenants.stripe_customer_id     IS 'Stripe Customer (cus_…) — vezava za Billing Portal in webhooke.';
COMMENT ON COLUMN app.tenants.stripe_subscription_id IS 'Stripe Subscription (sub_…) — vezava za status webhooke.';
