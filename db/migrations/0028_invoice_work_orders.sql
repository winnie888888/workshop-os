-- 0028: Zbirni račun (Consolidated Invoicing) — vezna tabela račun ↔ nalogi.
--
-- Spec (Consolidated Invoicing.pdf): flota/poslovna stranka dobi EN račun za
-- več zaključenih delovnih nalogov; sledljivost mora delovati v OBE smeri
-- (račun → nalogi, nalog → račun) in preživeti izvoz v Minimax. Obstoječi
-- enojni tok (invoices.issue z workOrderId) ostane nedotaknjen — ta tabela
-- pokrije razmerje 1 račun : N nalogov, ki ga en stolpec ne more.
--
-- Vsak nalog je lahko zaračunan največ enkrat (UNIQUE work_order_id) — to je
-- hkrati varovalka kandidatne poizvedbe in dvojnega obračuna. Vrstica se
-- zapiše atomarno ob izdaji zbirnega računa (ista transakcija kot račun).

CREATE TABLE app.invoice_work_orders (
  invoice_id    uuid NOT NULL REFERENCES app.invoices(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES app.work_orders(id),
  tenant_id     uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (invoice_id, work_order_id)
);

CREATE UNIQUE INDEX idx_iwo_work_order ON app.invoice_work_orders (work_order_id);
CREATE INDEX idx_iwo_tenant ON app.invoice_work_orders (tenant_id, created_at DESC);

ALTER TABLE app.invoice_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.invoice_work_orders FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON app.invoice_work_orders
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

GRANT SELECT, INSERT, DELETE ON app.invoice_work_orders TO workshop_app;
