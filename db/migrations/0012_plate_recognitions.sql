-- =============================================================================
-- 0012 — Plate recognitions (Phase 8): the record of each plate read
-- =============================================================================
-- Like ocr_extractions in Phase 7, this is a RECORD table, not a driver of any
-- state. Each row captures one plate-recognition event: the photo it came from,
-- the AI interaction that produced it (provenance), the raw and canonical plate,
-- the inferred country, the match outcome, and — if the advisor confirmed — the
-- work order that was opened or created. It supports re-review and lets us
-- measure recognition accuracy over time (how often the top candidate was the
-- one the advisor confirmed).
--
-- It never creates or opens a work order; that happens only through the existing
-- work-orders workflow on human confirmation. Forced tenant RLS as everywhere.
-- =============================================================================

CREATE TABLE app.plate_recognitions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  attachment_id      uuid REFERENCES app.attachments(id) ON DELETE SET NULL,
  interaction_id     uuid,
  -- What the model read and what we made of it.
  read_plate         text,
  canonical_plate    text,
  country            text,
  confidence         numeric,
  -- Match outcome shape (single / ambiguous / none) and the candidates payload.
  outcome            text NOT NULL DEFAULT 'none'
                       CHECK (outcome IN ('single','ambiguous','none')),
  review_payload     jsonb NOT NULL,
  -- Set when the advisor confirmed: which vehicle, and the work order opened or
  -- created (null while the recognition is still under review or abandoned).
  confirmed_asset_id uuid REFERENCES app.assets(id) ON DELETE SET NULL,
  work_order_id      uuid REFERENCES app.work_orders(id) ON DELETE SET NULL,
  work_order_created boolean,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_plate_recognitions_tenant     ON app.plate_recognitions(tenant_id, created_at DESC);
CREATE INDEX idx_plate_recognitions_asset      ON app.plate_recognitions(tenant_id, confirmed_asset_id);
CREATE INDEX idx_plate_recognitions_attachment ON app.plate_recognitions(tenant_id, attachment_id);

CREATE TRIGGER trg_plate_recognitions_touch
  BEFORE UPDATE ON app.plate_recognitions
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

ALTER TABLE app.plate_recognitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.plate_recognitions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON app.plate_recognitions
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA app TO workshop_app;
